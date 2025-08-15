import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationToken {
  id: string;
  user_id: string;
  token: string;
  device_type: 'ios' | 'android';
  created_at: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification service
   */
  async initialize(): Promise<void> {
    try {
      // Request permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      // Get push token
      if (Device.isDevice) {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: '5bd0baf7-8364-4882-a616-f528ca96e62e', // Your EAS project ID
        });
        this.expoPushToken = token.data;

        // Save token to database
        await this.saveTokenToDatabase(this.expoPushToken);
      } else {
        console.log('Must use physical device for Push Notifications');
      }

      // Set up notification listeners
      this.setupNotificationListeners();
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  /**
   * Save push token to Supabase database
   */
  private async saveTokenToDatabase(token: string): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return;
      }

      // Check if token already exists for this user
      const { data: existingToken, error: selectError } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('token', token)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 is "not found"
        console.error('Error checking existing push token:', selectError);
        // If it's a permission error, log it but don't fail
        if (selectError.code === '42501') {
          console.warn(
            'Permission denied for push_tokens table - push notifications may not work'
          );
          return;
        }
        return;
      }

      if (!existingToken) {
        // Insert new token
        const { error } = await supabase.from('push_tokens').insert({
          user_id: user.id,
          token: token,
          device_type: Platform.OS as 'ios' | 'android',
        });

        if (error) {
          console.error('Error saving push token:', error);
          // If it's a permission error, log it but don't fail
          if (error.code === '42501') {
            console.warn(
              'Permission denied for push_tokens table - push notifications may not work'
            );
            return;
          }
        } else {
          console.log('Push token saved successfully');
        }
      }
    } catch (error) {
      console.error('Error in saveTokenToDatabase:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  private setupNotificationListeners(): void {
    // Handle notification received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        // You can handle the notification here (e.g., update UI, play sound, etc.)
      }
    );

    // Handle notification response (when user taps notification)
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification response:', response);

        // Handle navigation based on notification data
        this.handleNotificationResponse(response);
      });

    // Store listeners for cleanup (you can add cleanup method if needed)
    this.notificationListener = notificationListener;
    this.responseListener = responseListener;
  }

  /**
   * Handle notification response and navigate accordingly
   */
  private handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): void {
    const data = response.notification.request.content.data as any;

    // Import router dynamically to avoid circular dependencies
    import('expo-router').then(({ router }) => {
      if (data?.type === 'new_comment' && data?.claim_id) {
        // Navigate to claim detail
        router.push({
          pathname: '/Speak-It/ClaimDetail' as any,
          params: { claimId: data.claim_id },
        });
      } else if (data?.type === 'new_claim' && data?.category) {
        // Navigate to category claims
        router.push({
          pathname: '/Speak-It/CategoryClaims' as any,
          params: { category: data.category },
        });
      } else if (data?.type === 'mention' && data?.comment_id) {
        // Navigate to specific comment
        router.push({
          pathname: '/Speak-It/ClaimDetail' as any,
          params: { claimId: data.claim_id, commentId: data.comment_id },
        });
      }
    });
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Send local notification (for testing)
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // Send immediately
    });
  }

  /**
   * Schedule local notification
   */
  async scheduleNotification(
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: any
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger,
    });
  }

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<
    Notifications.NotificationRequest[]
  > {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Remove push token from database when user logs out
   */
  async removeTokenFromDatabase(): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !this.expoPushToken) return;

      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('token', this.expoPushToken);

      if (error) {
        console.error('Error removing push token:', error);
        // If it's a permission error, log it but don't fail
        if (error.code === '42501') {
          console.warn(
            'Permission denied for push_tokens table - token removal failed'
          );
          return;
        }
      } else {
        console.log('Push token removed successfully');
        this.expoPushToken = null;
      }
    } catch (error) {
      console.error('Error in removeTokenFromDatabase:', error);
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
