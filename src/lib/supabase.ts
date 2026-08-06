import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ebgjdxnuxojjxqjmtbqq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZ2pkeG51eG9qanhxam10YnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NjY4ODIsImV4cCI6MjEwMTQ0Mjg4Mn0.-I1Ff-rDGMg_83Jmi5pZ5cAuJ0UaE8f2AQFqhxP1wU4';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);