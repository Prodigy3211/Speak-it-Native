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
    if (
      path.startsWith('/reset-password') ||
      path.startsWith('/auth/reset-password')
    ) {
      // Password reset flow
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (accessToken && refreshToken) {
        // Set the session for password reset
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
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
    } else if (path.startsWith('/auth/confirm')) {
      // Email confirmation flow
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (accessToken && refreshToken) {
        // Set the session for email confirmation
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
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
    } else if (path.startsWith('/category/') && path.includes('/thread/')) {
      // Web app format: /category/{category}/thread/{claimId}
      const pathParts = path.split('/');
      const categoryIndex = pathParts.indexOf('category') + 1;
      const threadIndex = pathParts.indexOf('thread') + 1;

      if (categoryIndex < pathParts.length && threadIndex < pathParts.length) {
        const category = decodeURIComponent(pathParts[categoryIndex]);
        const claimId = pathParts[threadIndex];

        // Navigate to claim detail
        router.push({
          pathname: '/Speak-It/ClaimDetail' as any,
          params: { claimId },
        });
      } else {
        router.push('/Speak-It/Home');
      }
    } else if (path.startsWith('/claim/')) {
      // Legacy mobile app format: /claim/{claimId}
      const claimId = path.split('/claim/')[1];
      if (claimId) {
        router.push({
          pathname: '/Speak-It/ClaimDetail' as any,
          params: { claimId },
        });
      } else {
        router.push('/Speak-It/Home');
      }
    } else if (path.startsWith('/category/')) {
      // Category link without thread
      const category = path.split('/category/')[1];
      if (category) {
        router.push({
          pathname: '/Speak-It/CategoryClaims' as any,
          params: { category: decodeURIComponent(category) },
        });
      } else {
        router.push('/Speak-It/Home');
      }
    } else if (path === '/' || path === '') {
      // Root path - go to home
      router.push('/Speak-It/Home');
    } else {
      // Unknown path - go to home
      console.log('Unknown deep link path:', path);
      router.push('/Speak-It/Home');
    }
  } catch (error) {
    console.error('Error handling deep link:', error);
    router.push('/');
  }
};

// Function to generate Universal Links (web URLs that open in mobile app if installed)
export const generateUniversalLink = (type: string, data?: any): string => {
  const baseUrl = 'https://speak-it-three.vercel.app';

  switch (type) {
    case 'claim':
      // This will open in mobile app if installed, fallback to web
      return `${baseUrl}/category/${encodeURIComponent(data.category)}/thread/${
        data.claimId
      }`;
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

// Function to generate custom scheme links (for direct app opening)
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

// Smart link generator that tries mobile first, then web
export const generateSmartLink = (type: string, data?: any): string => {
  // For sharing, we want to use Universal Links that will:
  // 1. Open in mobile app if installed
  // 2. Fall back to web app if not installed
  return generateUniversalLink(type, data);
};
