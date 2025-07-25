import { ErrorBoundary } from '@/components/ErrorBoundary';
import { enableBlockingService } from "@/lib/blockingService";
import { handleDeepLink } from "@/lib/deepLinks";
import { notificationService } from "@/lib/notificationService";
import { supabase } from '@/lib/supabase';

import * as Linking from 'expo-linking';
import { Stack } from "expo-router";
import { useEffect } from "react";

export default function RootLayout() {
  useEffect(() => {
    // Initialize notifications when app starts
    notificationService.initialize();
    
    // Enable blocking service
    enableBlockingService();
    
    // Handle session refresh
    const handleSessionRefresh = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          return;
        }
        
        if (session) {
          // Check if session is about to expire (within 5 minutes)
          const expiresAt = new Date(session.expires_at! * 1000);
          const now = new Date();
          const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
          
          if (expiresAt < fiveMinutesFromNow) {
            console.log('Session expiring soon, refreshing...');
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.error('Failed to refresh session:', refreshError);
            }
          }
        }
      } catch (error) {
        console.error('Error handling session refresh:', error);
      }
    };
    
    // Check session on app start
    handleSessionRefresh();
    
    // Set up periodic session checks
    const sessionInterval = setInterval(handleSessionRefresh, 5 * 60 * 1000); // Every 5 minutes
    
    // Handle deep links when app is already running
    const handleUrl = (url: string) => {
      handleDeepLink(url);
    };
    
    // Handle deep links when app is opened from a link
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };
    
    // Set up listeners
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });
    
    // Handle initial URL
    handleInitialURL();
    
    // Cleanup
    return () => {
      subscription?.remove();
      clearInterval(sessionInterval);
    };
  }, []);

  return (
    <ErrorBoundary>
      <Stack />
    </ErrorBoundary>
  );
}
