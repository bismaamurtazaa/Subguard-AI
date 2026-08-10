import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/* ══════════════════════════════════════════════════════════════
   OpenRouter AI helpers
   ══════════════════════════════════════════════════════════════ */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const AI_MODEL = 'google/gemini-2.0-flash-001';

async function callAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://subguard.app',
        'X-Title': 'SubGuard',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => 'unknown');
      console.error(`OpenRouter error ${res.status}:`, err.slice(0, 200));
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('OpenRouter request timed out');
    } else {
      console.error('OpenRouter call failed:', err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/* ──────────── AI: Enhance extraction when regex misses key fields ──────────── */

interface AIEnrichedInfo {
  service_name?: string;
  price?: number | null;
  billing_cycle?: 'monthly' | 'yearly' | null;
  next_billing_date?: string | null;
  trial_end_date?: string | null;
  is_trial?: boolean;
  category?: string;
}

const EXTRACTION_PROMPT = `You are a subscription email parser. Extract structured data from the email below.

Return ONLY valid JSON with these fields (use null for missing values):
{
  "service_name": "best-guess service name",
  "price": number or null (the amount, convert to PKR — treat $1 ≈ PKR 280, €1 ≈ PKR 300, £1 ≈ PKR 350),
  "billing_cycle": "monthly" | "yearly" | null,
  "next_billing_date": "YYYY-MM-DD" or null,
  "trial_end_date": "YYYY-MM-DD" or null,
  "is_trial": true/false,
  "category": "entertainment" | "productivity" | "utilities" | "health" | "shopping" | "other"
}`;

async function aiExtractInfo(
  subject: string,
  snippet: string,
  fromAddress: string,
  ruleBased: ExtractedInfo,
): Promise<ExtractedInfo> {
  const raw = await callAI(
    EXTRACTION_PROMPT,
    `Subject: ${subject}\nSnippet: ${snippet}\nFrom: ${fromAddress}\n\nReturn JSON.`,
  );

  if (!raw) return ruleBased;

  try {
    // Extract JSON from the response (handle markdown code fences)
    const jsonStr = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const enriched: AIEnrichedInfo = JSON.parse(jsonStr);

    return {
      serviceName: enriched.service_name ?? ruleBased.serviceName,
      price: enriched.price ?? ruleBased.price,
      billingCycle: enriched.billing_cycle ?? ruleBased.billingCycle,
      nextDate: enriched.next_billing_date ?? ruleBased.nextDate,
      trialEnd: enriched.trial_end_date ?? ruleBased.trialEnd,
      category: enriched.category ?? ruleBased.category,
      isTrial: enriched.is_trial ?? ruleBased.isTrial,
    };
  } catch {
    return ruleBased; // Parse failed — use rule-based result
  }
}

/* ──────────── AI: Comprehensive analysis (usage + overlaps + recommendations) ──────────── */

interface AIUsageResult {
  subscription_id: string;
  usage_score: number;         // 0–100
  usage_label: 'rarely' | 'occasional' | 'moderate' | 'frequent';
  reasoning: string;
}

interface AIOverlapResult {
  category: string;
  description: string;
  subscriptions: string[];     // subscription IDs
}

interface AIRecommendationResult {
  subscription_id: string | null;
  recommendation_type: 'cancel' | 'downgrade' | 'investigate';
  title: string;
  description: string;
  potential_savings_monthly: number;
  potential_savings_yearly: number;
  reason_category: string;
  urgency: 'high' | 'medium' | 'low';
  rank: number;
}

interface AIAnalysisResult {
  usage_scores: AIUsageResult[];
  overlaps: AIOverlapResult[];
  recommendations: AIRecommendationResult[];
}

const ANALYSIS_SYSTEM_PROMPT = `You are a subscription optimisation expert for SubGuard. Analyse the user's subscriptions and provide three things in a single JSON response:

1. **Usage scores** — For each subscription, score how actively it's used (0-100) based on:
   - Frequency of related emails (receipts, usage notifications)
   - Recent activity signals
   - Trial status (trials are high-usage by nature)
   Label: rarely(0-20), occasional(21-40), moderate(41-70), frequent(71-100).

2. **Overlap groups** — Subscriptions that serve a similar purpose (e.g. Netflix+Disney+ are video streaming overlaps). Group them with a descriptive category name.

3. **Recommendations** — Ranked suggestions to save money. Prioritise:
   - Low-usage subscriptions with high cost
   - Overlapping subscriptions where one could be dropped
   - Trials ending soon
   - Upcoming renewals where the subscription is barely used

Return ONLY valid JSON in this exact structure:
{
  "usage_scores": [
    { "subscription_id": "uuid", "usage_score": 75, "usage_label": "frequent", "reasoning": "brief explanation" }
  ],
  "overlaps": [
    { "category": "Video Streaming", "description": "Multiple video streaming services", "subscriptions": ["uuid1", "uuid2"] }
  ],
  "recommendations": [
    { "subscription_id": "uuid_or_null", "recommendation_type": "cancel", "title": "short title", "description": "explanation with savings", "potential_savings_monthly": 500, "potential_savings_yearly": 6000, "reason_category": "low_usage", "urgency": "medium", "rank": 1 }
  ]
}`;

async function aiAnalyzeSubscriptions(
  subscriptions: SubscriptionRow[],
  emailSnippets: DetectedEmailRow[],
  usageSignals: UsageSignalRow[],
): Promise<AIAnalysisResult | null> {
  // Build a concise summary of subscriptions for the AI
  const subSummaries = subscriptions.map((s) => ({
    id: s.id,
    name: s.service_name,
    price_pkr: s.price,
    cycle: s.billing_cycle,
    category: s.category,
    status: s.status,
    next_billing: s.next_billing_date,
    trial_end: s.trial_end_date,
    current_usage_score: s.usage_score,
    current_usage_label: s.usage_label,
  }));

  // Build a summary of detected emails relevant to these subscriptions
  const emailSummary = emailSnippets.slice(0, 50).map((e) => ({
    subject: e.subject,
    snippet: e.snippet?.slice(0, 120),
    received: e.received_at,
    category: e.category,
  }));

  // Build usage signal summary
  const signalsSummary = usageSignals.slice(0, 30).map((sig) => ({
    type: sig.signal_type,
    date: sig.signal_date,
    summary: sig.signal_summary?.slice(0, 100),
  }));

  const userPrompt = JSON.stringify({
    subscriptions: subSummaries,
    recent_emails: emailSummary,
    usage_signals: signalsSummary,
  });

  const raw = await callAI(ANALYSIS_SYSTEM_PROMPT, userPrompt);
  if (!raw) return null;

  try {
    const jsonStr = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const result: AIAnalysisResult = JSON.parse(jsonStr);

    // Validate structure — return null if missing critical fields
    if (!Array.isArray(result.usage_scores) || !Array.isArray(result.recommendations)) {
      return null;
    }
    if (result.usage_scores.length === 0 && result.recommendations.length === 0) {
      return null;
    }

    return result;
  } catch (err) {
    console.error('AI analysis JSON parse error:', err);
    return null;
  }
}

/* ──────────── Gmail API helpers ──────────── */

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function gmailFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${GMAIL_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gmail API error ${res.status}: ${body}`);
  }
  return res.json();
}

function decodeBase64Url(s: string): string {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  try {
    return decodeURIComponent(
      atob(s)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
  } catch {
    return atob(s);
  }
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  const h = headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  );
  return h?.value ?? '';
}

/* ──────────── Known subscription senders ──────────── */

const KNOWN_DOMAINS: Record<string, { service: string; category: string }> = {
  'netflix.com': { service: 'Netflix', category: 'entertainment' },
  'spotify.com': { service: 'Spotify', category: 'entertainment' },
  'deezer.com': { service: 'Deezer', category: 'entertainment' },
  'youtube.com': { service: 'YouTube Premium', category: 'entertainment' },
  'openai.com': { service: 'ChatGPT Plus', category: 'productivity' },
  'anthropic.com': { service: 'Claude', category: 'productivity' },
  'adobe.com': { service: 'Adobe Creative Cloud', category: 'productivity' },
  'canva.com': { service: 'Canva', category: 'productivity' },
  'capcut.com': { service: 'CapCut', category: 'productivity' },
  'bytedance.com': { service: 'CapCut', category: 'productivity' },
  'notion.so': { service: 'Notion', category: 'productivity' },
  'amazon.com': { service: 'Amazon Prime', category: 'shopping' },
  'linkedin.com': { service: 'LinkedIn Premium', category: 'productivity' },
  'fitbit.com': { service: 'Fitbit Premium', category: 'health' },
  'apple.com': { service: 'Apple Service', category: 'utilities' },
  'icloud.com': { service: 'iCloud+', category: 'utilities' },
  'google.com': { service: 'Google One', category: 'utilities' },
  'dropbox.com': { service: 'Dropbox', category: 'utilities' },
  'slack.com': { service: 'Slack', category: 'productivity' },
  'github.com': { service: 'GitHub', category: 'productivity' },
  'medium.com': { service: 'Medium', category: 'entertainment' },
  'disneyplus.com': { service: 'Disney+', category: 'entertainment' },
  'hulu.com': { service: 'Hulu', category: 'entertainment' },
  'hbomax.com': { service: 'HBO Max', category: 'entertainment' },
  'paramountplus.com': { service: 'Paramount+', category: 'entertainment' },
  'peacocktv.com': { service: 'Peacock', category: 'entertainment' },
};

/* ──────────── Search query builder ──────────── */

function buildSearchQuery(): string {
  // Use clean domain syntax (no wildcard prefix — Gmail doesn't reliably support *@)
  const domainQueries = Object.keys(KNOWN_DOMAINS).map(
    (d) => `from:${d}`,
  );
  const keywordQueries = [
    'subject:("subscription confirmed" OR "trial started" OR "payment successful" OR "receipt" OR "invoice" OR "your subscription" OR "welcome to" OR "billing" OR "renewal" OR "payment received" OR "order confirmation" OR "thank you for your purchase")',
  ];
  const recent = new Date();
  recent.setMonth(recent.getMonth() - 6);
  const dateStr = recent.toISOString().slice(0, 10);
  return `(${domainQueries.join(' OR ')}) OR (${keywordQueries.join(' OR ')} AND after:${dateStr})`;
}

/* ──────────── Subscription extractor (rule-based) ──────────── */

interface ExtractedInfo {
  serviceName: string;
  price: number | null;
  billingCycle: string | null;
  nextDate: string | null;
  trialEnd: string | null;
  category: string;
  isTrial: boolean;
}

const PRICE_PATTERNS = [
  /(?:PKR|Rs\.?|₹|USD|\$|EUR|£)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:PKR|Rs\.?|₹|USD|\$|EUR|£)/i,
  /(?:charged|price|amount|payment|cost)\s*(?:of|:|\s)\s*(?:PKR|Rs\.?|₹|\$|EUR|£)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:PKR|Rs|USD|EUR)/i,
];

const DATE_PATTERNS = [
  /(?:renew(?:s|al)?|next billing|billing date|charged on)\s*:?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(20\d{2})?/i,
  /(?:renew(?:s|al)?|next billing|billing date|charged on)\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i,
  /(?:trial ends?|trial expiration|free trial ends?)\s*:?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(20\d{2})?/i,
  /(?:trial ends?|trial expiration|free trial ends?)\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i,
  /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(20\d{2})/i,
  /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})/i,
];

const BILLING_PATTERNS = [
  /(?:per|every|each|billed)\s+(month|year|monthly|yearly|annually)/i,
  /(\d+)\s*(month|year|monthly|yearly)/i,
  /billing\s+cycle\s*:?\s*(monthly|yearly|annually)/i,
];

const TRIAL_KEYWORDS = /free trial|trial start|trial ends?|trial expiration|trial period/i;

function extractMonthNum(m: string): number {
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };
  return months[m.toLowerCase().slice(0, 3)] ?? 0;
}

function parseDateFromText(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const m = text.match(pattern);
    if (!m) continue;

    if (m[1] && isNaN(Number(m[1]))) {
      const month = extractMonthNum(m[1]);
      const day = parseInt(m[2]);
      const year = m[3] ? parseInt(m[3]) : new Date().getFullYear();
      if (month && day) {
        const d = new Date(year, month - 1, day);
        return d.toISOString().slice(0, 10);
      }
    }
    if (m[1] && !isNaN(Number(m[1])) && m[2] && !isNaN(Number(m[2]))) {
      let month = parseInt(m[1]);
      let day = parseInt(m[2]);
      let year = m[3] ? parseInt(m[3]) : new Date().getFullYear();
      if (year < 100) year += 2000;
      if (month > 12) {
        [day, month] = [month, day];
      }
      const d = new Date(year, month - 1, day);
      return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

function extractPrice(text: string): number | null {
  for (const pattern of PRICE_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      const num = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0 && num < 1000000) return num;
    }
  }
  return null;
}

function extractBillingCycle(text: string): string | null {
  for (const pattern of BILLING_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      const val = m[1]?.toLowerCase() || m[2]?.toLowerCase();
      if (val.startsWith('month')) return 'monthly';
      if (val.startsWith('year') || val.startsWith('ann')) return 'yearly';
    }
  }
  return null;
}

function extractServiceName(fromAddress: string, subject: string, snippet: string): { service: string; category: string } {
  const fromLower = fromAddress.toLowerCase();

  for (const [domain, info] of Object.entries(KNOWN_DOMAINS)) {
    if (fromLower.includes(domain)) {
      const combined = `${subject} ${snippet}`;
      if (domain === 'netflix.com' && combined.match(/premium|basic|standard|ultra/i)) {
        const tier = combined.match(/\b(premium|basic|standard|ultra)\b/i)?.[1] || '';
        return { service: `Netflix ${tier.charAt(0).toUpperCase() + tier.slice(1)}`.trim(), category: info.category };
      }
      if (domain === 'spotify.com') {
        if (combined.match(/family/i)) return { service: 'Spotify Family', category: info.category };
        if (combined.match(/duo|premium/i)) return { service: 'Spotify Premium', category: info.category };
        if (combined.match(/student/i)) return { service: 'Spotify Student', category: info.category };
        return { service: 'Spotify', category: info.category };
      }
      if (domain === 'apple.com' || domain === 'icloud.com') {
        if (combined.match(/icloud|storage/i)) return { service: 'iCloud+', category: info.category };
        if (combined.match(/apple music/i)) return { service: 'Apple Music', category: 'entertainment' };
        if (combined.match(/apple tv|tv\+/i)) return { service: 'Apple TV+', category: 'entertainment' };
        if (combined.match(/apple one/i)) return { service: 'Apple One', category: 'utilities' };
        if (combined.match(/arcade/i)) return { service: 'Apple Arcade', category: 'entertainment' };
        return { service: 'Apple Service', category: info.category };
      }
      return info;
    }
  }

  const combined = `${subject} ${snippet}`;
  const subMatch = combined.match(/(?:your\s+)?(.+?)\s+(?:subscription|plan|membership|premium|pro|plus)/i);
  if (subMatch) {
    return { service: subMatch[1].trim(), category: 'other' };
  }

  const domainMatch = fromAddress.match(/@([^.]+)/);
  if (domainMatch) {
    const name = domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1);
    return { service: name, category: 'other' };
  }

  return { service: 'Unknown Service', category: 'other' };
}

function extractInfo(subject: string, snippet: string, fromAddress: string): ExtractedInfo {
  const text = `${subject} ${snippet}`;
  const { service, category } = extractServiceName(fromAddress, subject, snippet);
  const price = extractPrice(text);
  const billingCycle = extractBillingCycle(text);
  const nextDate = parseDateFromText(text);
  const isTrial = TRIAL_KEYWORDS.test(text);
  const trialEnd = isTrial ? nextDate : null;

  const finalCycle = billingCycle || 'monthly';

  return {
    serviceName: service,
    price,                               // null when not found — do NOT coerce to 0
    billingCycle: finalCycle,
    nextDate: isTrial ? null : nextDate,
    trialEnd,
    category,
    isTrial,
  };
}

/* ══════════════════════════════════════════════════════════════
   Types for the AI analysis
   ══════════════════════════════════════════════════════════════ */

interface SubscriptionRow {
  id: string;
  user_id: string;
  service_name: string;
  price: number;
  currency: string;
  billing_cycle: string;
  category: string;
  status: string;
  next_billing_date: string | null;
  trial_end_date: string | null;
  detected_email_id: string | null;
  is_manually_added: boolean;
  usage_score: number;
  usage_label: string;
  created_at: string;
  updated_at: string;
}

interface DetectedEmailRow {
  id: string;
  user_id: string;
  gmail_message_id: string | null;
  from_address: string | null;
  subject: string | null;
  snippet: string | null;
  received_at: string | null;
  category: string;
  is_processed: boolean;
  created_at: string;
}

interface UsageSignalRow {
  id: string;
  subscription_id: string;
  signal_type: string;
  detected_email_id: string | null;
  signal_date: string | null;
  signal_summary: string | null;
  created_at: string;
}

/* ══════════════════════════════════════════════════════════════
   Main handler
   ══════════════════════════════════════════════════════════════ */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const { providerToken } = await req.json();
    if (!providerToken) {
      return new Response(JSON.stringify({ error: 'Missing providerToken in body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with user context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
        ? JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')!)['default']
        : Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    // Verify user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Gmail profile
    const profile = await gmailFetch('/profile', providerToken);
    const gmailEmail = profile.emailAddress;

    // Build search query
    const query = buildSearchQuery();

    // Search for messages
    const searchResult = await gmailFetch(
      `/messages?q=${encodeURIComponent(query)}&maxResults=50`,
      providerToken,
    );

    const messageIds: string[] = searchResult.messages?.map((m: { id: string }) => m.id) ?? [];

    if (messageIds.length === 0) {
      await supabaseClient.from('user_gmail_tokens').upsert({
        user_id: user.id,
        gmail_email: gmailEmail,
        last_scan_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      return new Response(JSON.stringify({
        success: true,
        emailsFound: 0,
        subscriptionsFound: 0,
        message: 'No subscription emails found in the last 6 months.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process each message
    const detected: { emailId?: string; subId?: string }[] = [];
    const processedCount = { emails: 0, subscriptions: 0 };
    const newSnippets: { subject: string; snippet: string; received_at: string; category: string }[] = [];

    for (const msgId of messageIds) {
      try {
        const msg = await gmailFetch(
          `/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          providerToken,
        );

        const headers = msg.payload?.headers ?? [];
        const fromAddress = getHeader(headers, 'From');
        const subject = getHeader(headers, 'Subject');
        const snippet = msg.snippet ?? '';
        const receivedAt = new Date(parseInt(msg.internalDate) || Date.now()).toISOString();

        // Extract subscription info (rule-based first)
        let info = extractInfo(subject, snippet, fromAddress);

        // AI enhancement: call when regex missed key fields
        const needsAI = !info.price || info.price <= 0 ||
          info.serviceName === 'Unknown Service' ||
          (!info.nextDate && !info.trialEnd);

        if (needsAI) {
          const enhanced = await aiExtractInfo(subject, snippet, fromAddress, info);
          // Only use enhanced values that actually improved — never regress a known good service name
          info = {
            ...info,
            serviceName: enhanced.serviceName !== 'Unknown Service' ? enhanced.serviceName : info.serviceName,
            price: enhanced.price && enhanced.price > 0 ? enhanced.price : info.price,
            billingCycle: enhanced.billingCycle ?? info.billingCycle,
            nextDate: enhanced.nextDate ?? info.nextDate,
            trialEnd: enhanced.trialEnd ?? info.trialEnd,
            category: enhanced.category !== 'other' ? enhanced.category : info.category,
            isTrial: enhanced.isTrial ?? info.isTrial,
          };
        }

        // Store detected email
        const { data: emailRecord, error: emailError } = await supabaseClient
          .from('detected_emails')
          .upsert({
            user_id: user.id,
            gmail_message_id: msgId,
            from_address: fromAddress,
            subject,
            snippet,
            received_at: receivedAt,
            category: info.category,
            is_processed: true,
          }, { onConflict: 'gmail_message_id', ignoreDuplicates: 'gmail_message_id' })
          .select('id')
          .single();

        if (emailError) {
          console.error('Error storing email:', emailError.message);
          continue;
        }

        const emailId = emailRecord?.id;
        processedCount.emails++;

        newSnippets.push({
          subject,
          snippet,
          received_at: receivedAt,
          category: info.category,
        });

        // Log every message we process
        console.log(`Processing: subject="${subject}" from="${fromAddress}" service="${info.serviceName}" price=${info.price} isTrial=${info.isTrial}`);

        // Determine if the sender is a known subscription domain
        const fromLower = fromAddress.toLowerCase();
        const isKnownDomain = Object.keys(KNOWN_DOMAINS).some(
          (d) => fromLower.includes(d),
        );

        // Check if service already exists for this user
        const { data: existingSub } = await supabaseClient
          .from('subscriptions')
          .select('id, service_name')
          .eq('user_id', user.id)
          .ilike('service_name', `%${info.serviceName.split(' ').slice(0, 2).join(' ')}%`)
          .maybeSingle();

        // Create subscription when:
        //   a) price is known and > 0, OR
        //   b) service is confidently identified from a known domain (price may be in HTML body, not snippet)
        // Skip if service name is "Unknown Service" with no price.
        const shouldCreate = !existingSub && (
          (info.price !== null && info.price > 0) ||
          (isKnownDomain && info.serviceName !== 'Unknown Service') ||
          (info.isTrial)
        );

        if (shouldCreate) {
          console.log(`Creating subscription: "${info.serviceName}" price=${info.price ?? 'unknown'} domain=${isKnownDomain}`);
          // Create new subscription
          const { data: subRecord, error: subError } = await supabaseClient
            .from('subscriptions')
            .insert({
              user_id: user.id,
              service_name: info.serviceName,
              price: info.price ?? 0,
              currency: 'PKR',
              billing_cycle: info.billingCycle || 'monthly',
              category: info.category,
              status: info.isTrial ? 'trial' : 'active',
              next_billing_date: info.nextDate,
              trial_end_date: info.trialEnd,
              detected_email_id: emailId,
              is_manually_added: false,
              usage_score: info.isTrial ? 90 : 50,
              usage_label: info.isTrial ? 'frequent' : 'moderate',
            })
            .select('id')
            .single();

          if (!subError && subRecord) {
            processedCount.subscriptions++;
            detected.push({ emailId, subId: subRecord.id });

            // Store a usage signal from the detected email
            await supabaseClient.from('usage_signals').insert({
              subscription_id: subRecord.id,
              signal_type: 'email_detected',
              detected_email_id: emailId,
              signal_date: receivedAt,
              signal_summary: `Email from ${fromAddress}: ${subject}`,
            }).catch(() => {});
          } else {
            console.error(`Failed to create subscription for "${info.serviceName}":`, subError?.message);
          }
        } else if (existingSub) {
          // Update existing
          await supabaseClient
            .from('subscriptions')
            .update({
              detected_email_id: emailId,
              updated_at: new Date().toISOString(),
              ...(info.nextDate ? { next_billing_date: info.nextDate } : {}),
              ...(info.price && info.price > 0 ? { price: info.price } : {}),
            })
            .eq('id', existingSub.id);

          detected.push({ emailId, subId: existingSub.id });

          // Store usage signal
          await supabaseClient.from('usage_signals').insert({
            subscription_id: existingSub.id,
            signal_type: 'email_detected',
            detected_email_id: emailId,
            signal_date: receivedAt,
            signal_summary: `Email from ${fromAddress}: ${subject}`,
          }).catch(() => {});
        }
      } catch (err) {
        console.error(`Error processing message ${msgId}:`, err);
      }
    }

    // Update the user_gmail_tokens record
    await supabaseClient.from('user_gmail_tokens').upsert({
      user_id: user.id,
      gmail_email: gmailEmail,
      last_scan_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // Generate AI-powered recommendations and alerts
    await generateAIRecommendationsAndAlerts(
      supabaseClient,
      user.id,
      newSnippets,
    );

    return new Response(JSON.stringify({
      success: true,
      emailsFound: processedCount.emails,
      subscriptionsFound: processedCount.subscriptions,
      emailsProcessed: messageIds.length,
      gmailEmail,
      detected,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Scan error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/* ══════════════════════════════════════════════════════════════
   AI-powered post-scan intelligence
   ══════════════════════════════════════════════════════════════ */

async function generateAIRecommendationsAndAlerts(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  newSnippets: { subject: string; snippet: string; received_at: string; category: string }[],
) {
  // Get user's active subscriptions
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'trial']);

  if (!subs || subs.length === 0) return;

  // Get detected emails for context
  const { data: emails } = await supabase
    .from('detected_emails')
    .select('*')
    .eq('user_id', userId)
    .order('received_at', { ascending: false })
    .limit(50);

  // Get existing usage signals
  const subIds = subs.map((s: SubscriptionRow) => s.id);
  const { data: signals } = await supabase
    .from('usage_signals')
    .select('*')
    .in('subscription_id', subIds)
    .order('signal_date', { ascending: false })
    .limit(100);

  // ── Step 1: Try AI-powered analysis ──
  const aiResult = await aiAnalyzeSubscriptions(
    subs as SubscriptionRow[],
    (emails ?? []) as DetectedEmailRow[],
    (signals ?? []) as UsageSignalRow[],
  );

  // ── Step 2: Generate renewal alerts (always do this — date-based, no AI needed) ──
  const alerts: {
    user_id: string;
    subscription_id: string;
    alert_type: string;
    days_before: number;
    urgency: string;
    title: string;
    message: string;
    scheduled_at: string;
  }[] = [];

  for (const sub of subs as SubscriptionRow[]) {
    if (sub.next_billing_date) {
      const nextDate = new Date(sub.next_billing_date);
      const daysBefore = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (daysBefore > 0 && daysBefore <= 14) {
        const urgency = daysBefore <= 3 ? 'high' : daysBefore <= 7 ? 'medium' : 'low';
        alerts.push({
          user_id: userId,
          subscription_id: sub.id,
          alert_type: 'renewal',
          days_before: daysBefore,
          urgency,
          title: `${sub.service_name} renews in ${daysBefore} days`,
          message: `PKR ${sub.price.toLocaleString()} will be charged on ${new Date(sub.next_billing_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
          scheduled_at: nextDate.toISOString(),
        });
      }
    }

    if (sub.trial_end_date) {
      const trialEnd = new Date(sub.trial_end_date);
      const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (daysLeft > 0 && daysLeft <= 10) {
        alerts.push({
          user_id: userId,
          subscription_id: sub.id,
          alert_type: 'trial_ending',
          days_before: daysLeft,
          urgency: daysLeft <= 3 ? 'high' : 'medium',
          title: `${sub.service_name} trial ends in ${daysLeft} days`,
          message: `Your free trial ends on ${trialEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}. You will be charged PKR ${sub.price.toLocaleString()}/month after that.`,
          scheduled_at: trialEnd.toISOString(),
        });
      }
    }
  }

  // Insert alerts
  for (const alert of alerts) {
    await supabase.from('renewal_alerts').insert(alert);
  }

  // ── Step 3: Apply AI insights (or fall back to heuristic) ──
  if (aiResult) {
    await applyAIResults(supabase, userId, subs as SubscriptionRow[], aiResult);
  } else {
    console.log('AI analysis unavailable — falling back to heuristic logic');
    await heuristicFallback(supabase, userId, subs as SubscriptionRow[]);
  }
}

/* ──────────── Apply AI analysis results ──────────── */

async function applyAIResults(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  subs: SubscriptionRow[],
  result: AIAnalysisResult,
) {
  const subMap = new Map(subs.map((s) => [s.id, s]));

  // 1. Update usage scores
  for (const score of result.usage_scores) {
    const sub = subMap.get(score.subscription_id);
    if (!sub) continue;

    await supabase
      .from('subscriptions')
      .update({
        usage_score: Math.max(0, Math.min(100, score.usage_score)),
        usage_label: score.usage_label,
        updated_at: new Date().toISOString(),
      })
      .eq('id', score.subscription_id)
      .eq('user_id', userId);
  }

  // 2. Create overlap groups
  for (const group of result.overlaps) {
    if (group.subscriptions.length < 2) continue;

    const { data: overlapGroup } = await supabase
      .from('overlap_groups')
      .insert({
        user_id: userId,
        category: group.category,
        description: group.description,
      })
      .select('id')
      .single();

    if (overlapGroup) {
      for (const subId of group.subscriptions) {
        if (subMap.has(subId)) {
          await supabase.from('overlap_members')
            .upsert({
              overlap_group_id: overlapGroup.id,
              subscription_id: subId,
            }, { onConflict: ['overlap_group_id', 'subscription_id'].join(',') });
        }
      }
    }
  }

  // 3. Create recommendations
  for (const rec of result.recommendations) {
    // Validate that subscription_id exists if provided
    if (rec.subscription_id && !subMap.has(rec.subscription_id)) continue;

    await supabase.from('recommendations').insert({
      user_id: userId,
      subscription_id: rec.subscription_id,
      recommendation_type: rec.recommendation_type,
      title: rec.title,
      description: rec.description,
      potential_savings_monthly: rec.potential_savings_monthly,
      potential_savings_yearly: rec.potential_savings_yearly,
      reason_category: rec.reason_category,
      urgency: rec.urgency,
      rank: rec.rank,
      is_dismissed: false,
    });
  }
}

/* ──────────── Heuristic fallback (original logic) ──────────── */

async function heuristicFallback(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  subs: SubscriptionRow[],
) {
  // Overlap detection by category
  const categoryGroups = new Map<string, SubscriptionRow[]>();
  for (const sub of subs) {
    const existing = categoryGroups.get(sub.category) ?? [];
    existing.push(sub);
    categoryGroups.set(sub.category, existing);
  }

  for (const [category, categorySubs] of categoryGroups) {
    if (categorySubs.length > 1) {
      const { data: group } = await supabase
        .from('overlap_groups')
        .insert({
          user_id: userId,
          category: `${category.charAt(0).toUpperCase() + category.slice(1)} Overlap`,
          description: `You have ${categorySubs.length} subscriptions in the ${category} category. Consider consolidating.`,
        })
        .select('id')
        .single();

      if (group) {
        for (const sub of categorySubs) {
          await supabase.from('overlap_members')
            .upsert({
              overlap_group_id: group.id,
              subscription_id: sub.id,
            }, { onConflict: ['overlap_group_id', 'subscription_id'].join(',') });
        }
      }
    }
  }

  // Savings recommendations based on usage score
  for (const sub of subs) {
    if (sub.usage_label === 'rarely' || sub.usage_score <= 20) {
      await supabase.from('recommendations').insert({
        user_id: userId,
        subscription_id: sub.id,
        recommendation_type: 'cancel',
        title: `Cancel ${sub.service_name} — low usage`,
        description: `You rarely use ${sub.service_name}. Cancelling would save PKR ${sub.price.toLocaleString()}/month.`,
        potential_savings_monthly: sub.price,
        potential_savings_yearly: sub.price * 12,
        reason_category: 'low_usage',
        urgency: sub.usage_score <= 5 ? 'high' : 'medium',
        rank: 1,
        is_dismissed: false,
      });
    }
  }
}