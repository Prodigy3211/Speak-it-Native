import { router } from 'expo-router';
import { supabase } from './supabase';

export interface DeepLinkData {
  type: 'password-reset' | 'email-confirmation' | 'claim' | 'category';
  data?: any;
}

export const handleDeepLink = async (url: string): Promise<void> => {
  try {
    console.log('Handling deep link:', url);
    
    // Parse the URL
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const searchParams = urlObj.searchParams;
    
    // Handle different types of deep links
    if (path.startsWith('/reset-password') || path.startsWith('/auth/reset-password')) {
      // Password reset flow
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        // Set the session for password reset
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (!error) {
          router.push('/reset-password');
        } else {
          console.error('Error setting session for password reset:', error);
          router.push('/');
        }
      } else {
        // No tokens, redirect to login
        router.push('/');
      }
    }
    
    else if (path.startsWith('/auth/confirm')) {
      // Email confirmation flow
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        // Set the session for email confirmation
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (!error) {
          // Email confirmed successfully
          router.push('/Speak-It/Home');
        } else {
          console.error('Error setting session for email confirmation:', error);
          router.push('/');
        }
      } else {
        // No tokens, redirect to login
        router.push('/');
      }
    }
    
    else if (path.startsWith('/claim/')) {
      // Shared claim link
      const claimId = path.split('/claim/')[1];
      if (claimId) {
        router.push({
          pathname: '/Speak-It/ClaimDetail' as any,
          params: { claimId }
        });
      } else {
        router.push('/Speak-It/Home');
      }
    }
    
    else if (path.startsWith('/category/')) {
      // Category link
      const category = path.split('/category/')[1];
      if (category) {
        router.push({
          pathname: '/Speak-It/CategoryClaims' as any,
          params: { category: decodeURIComponent(category) }
        });
      } else {
        router.push('/Speak-It/Home');
      }
    }
    
    else if (path === '/' || path === '') {
      // Root path - go to home
      router.push('/Speak-It/Home');
    }
    
    else {
      // Unknown path - go to home
      console.log('Unknown deep link path:', path);
      router.push('/Speak-It/Home');
    }
    
  } catch (error) {
    console.error('Error handling deep link:', error);
    router.push('/');
  }
};

export const generateDeepLink = (type: string, data?: any): string => {
  const baseUrl = 'https://speak-it-three.vercel.app';
  
  switch (type) {
    case 'claim':
      return `${baseUrl}/claim/${data.claimId}`;
    case 'category':
      return `${baseUrl}/category/${encodeURIComponent(data.category)}`;
    case 'password-reset':
      return `${baseUrl}/reset-password`;
    case 'email-confirmation':
      return `${baseUrl}/auth/confirm`;
    default:
      return baseUrl;
  }
};

export const generateCustomSchemeLink = (type: string, data?: any): string => {
  const scheme = 'speakitmobile://';
  
  switch (type) {
    case 'claim':
      return `${scheme}claim/${data.claimId}`;
    case 'category':
      return `${scheme}category/${encodeURIComponent(data.category)}`;
    case 'password-reset':
      return `${scheme}reset-password`;
    case 'email-confirmation':
      return `${scheme}auth/confirm`;
    default:
      return scheme;
  }
}; 