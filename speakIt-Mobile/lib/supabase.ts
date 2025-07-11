import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// Replace these with your actual Supabase URL and anon key
const supabaseUrl = 'https://qdpammoeepwgapqyfrrh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcGFtbW9lZXB3Z2FwcXlmcnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxOTE2MzEsImV4cCI6MjA0Mjc2NzYzMX0.xb1Znb9PS_uP2WZF0unU-aDopiw-46sSbj3anzQUoLY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 