import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
  // Pad
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
  'adobe.com': { service: 'Adobe Creative Cloud', category: 'productivity' },
  'canva.com': { service: 'Canva', category: 'productivity' },
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
  const domainQueries = Object.keys(KNOWN_DOMAINS).map(
    (d) => `from:(*@${d})`,
  );
  const keywordQueries = [
    'subject:("subscription confirmed" OR "trial started" OR "payment successful" OR "receipt" OR "invoice" OR "your subscription" OR "welcome to" OR "billing" OR "renewal" OR "payment received")',
  ];
  // Only look at last 6 months
  const recent = new Date();
  recent.setMonth(recent.getMonth() - 6);
  const dateStr = recent.toISOString().slice(0, 10);
  return `(${domainQueries.join(' OR ')}) OR (${keywordQueries.join(' OR ')} AND after:${dateStr})`;
}

/* ──────────── Subscription extractor ──────────── */

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

    // Named month pattern
    if (m[1] && isNaN(Number(m[1]))) {
      const month = extractMonthNum(m[1]);
      const day = parseInt(m[2]);
      const year = m[3] ? parseInt(m[3]) : new Date().getFullYear();
      if (month && day) {
        const d = new Date(year, month - 1, day);
        return d.toISOString().slice(0, 10);
      }
    }
    // Numeric date
    if (m[1] && !isNaN(Number(m[1])) && m[2] && !isNaN(Number(m[2]))) {
      let month = parseInt(m[1]);
      let day = parseInt(m[2]);
      let year = m[3] ? parseInt(m[3]) : new Date().getFullYear();
      if (year < 100) year += 2000;
      // If first value > 12, it's likely day/month
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
      // Try to find a more specific name from subject/snippet
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

  // Try to extract from subject/snippet
  const combined = `${subject} ${snippet}`;
  const subMatch = combined.match(/(?:your\s+)?(.+?)\s+(?:subscription|plan|membership|premium|pro|plus)/i);
  if (subMatch) {
    return { service: subMatch[1].trim(), category: 'other' };
  }

  // Extract domain name as fallback
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

  // Default billing cycle
  const finalCycle = billingCycle || 'monthly';

  return {
    serviceName: service,
    price: price || 0,
    billingCycle: finalCycle,
    nextDate: isTrial ? null : nextDate,
    trialEnd,
    category,
    isTrial,
  };
}

/* ──────────── Main handler ──────────── */

Deno.serve(async (req: Request) => {
  // CORS preflight
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
      // Update last scan time
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

    for (const msgId of messageIds) {
      try {
        const msg = await gmailFetch(`/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, providerToken);

        const headers = msg.payload?.headers ?? [];
        const fromAddress = getHeader(headers, 'From');
        const subject = getHeader(headers, 'Subject');
        const snippet = msg.snippet ?? '';
        const receivedAt = new Date(parseInt(msg.internalDate) || Date.now()).toISOString();

        // Extract subscription info
        const info = extractInfo(subject, snippet, fromAddress);

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

        // Check if this service already exists for this user
        const { data: existingSub } = await supabaseClient
          .from('subscriptions')
          .select('id, service_name')
          .eq('user_id', user.id)
          .ilike('service_name', `%${info.serviceName.split(' ').slice(0, 2).join(' ')}%`)
          .maybeSingle();

        if (!existingSub && info.price && info.price > 0) {
          // Create new subscription
          const { data: subRecord, error: subError } = await supabaseClient
            .from('subscriptions')
            .insert({
              user_id: user.id,
              service_name: info.serviceName,
              price: info.price,
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

    // Generate recommendations and alerts for found subscriptions
    if (processedCount.subscriptions > 0) {
      await generateRecommendationsAndAlerts(supabaseClient, user.id);
    }

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

/* ──────────── Post-scan intelligence ──────────── */

async function generateRecommendationsAndAlerts(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  // Get user's active subscriptions
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'trial']);

  if (!subs || subs.length === 0) return;

  // Generate recommendations for low-usage or overlapping subscriptions
  const recs: {
    user_id: string;
    subscription_id: string;
    recommendation_type: string;
    title: string;
    description: string;
    potential_savings_monthly: number;
    potential_savings_yearly: number;
    reason_category: string;
    urgency: string;
    rank: number;
  }[] = [];

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

  // Find overlap groups (by category)
  const categoryGroups = new Map<string, typeof subs>();
  for (const sub of subs) {
    const existing = categoryGroups.get(sub.category) ?? [];
    existing.push(sub);
    categoryGroups.set(sub.category, existing);
  }

  for (const [category, categorySubs] of categoryGroups) {
    if (categorySubs.length > 1) {
      // Create overlap group
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
          await supabase.from('overlap_members').upsert({
            overlap_group_id: group.id,
            subscription_id: sub.id,
          }, { onConflict: ['overlap_group_id', 'subscription_id'].join(',') });
        }
      }
    }
  }

  // Generate renewal alerts
  for (const sub of subs) {
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

  // Generate savings recommendations (low usage or cancelled soon)
  for (const sub of subs) {
    if (sub.usage_label === 'rarely' || sub.usage_score <= 20) {
      recs.push({
        user_id: userId,
        subscription_id: sub.id,
        recommendation_type: 'cancel',
        title: `Cancel ${sub.serviceName || sub.service_name} — low usage`,
        description: `You rarely use ${sub.service_name}. Cancelling would save PKR ${sub.price.toLocaleString()}/month.`,
        potential_savings_monthly: sub.price,
        potential_savings_yearly: sub.price * 12,
        reason_category: 'low_usage',
        urgency: sub.usage_score <= 5 ? 'high' : 'medium',
        rank: 1,
      });
    }
  }

  // Insert recommendations
  for (const rec of recs) {
    await supabase.from('recommendations').insert(rec);
  }
}