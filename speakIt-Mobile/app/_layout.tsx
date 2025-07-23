import { Stack } from "expo-router";
import { useEffect } from "react";
import { notificationService } from "@/lib/notificationService";
import { handleDeepLink } from "@/lib/deepLinks";
import * as Linking from 'expo-linking';

export default function RootLayout() {
  useEffect(() => {
    // Initialize notifications when app starts
    notificationService.initialize();
    
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
    };
  }, []);

  return <Stack />;
}
