import { supabase } from './supabase';

/**
 * Send a push notification to a specific user
 */
export const sendNotification = async (
  targetUserId: string,
  title: string,
  body: string,
  data?: any,
  sound: string = 'default',
  badge?: number
) => {
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          targetUserId,
          title,
          body,
          data,
          sound,
          badge,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send notification:', error);
      return { success: false, error };
    }

    const result = await response.json();
    return { success: true, ...result };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error };
  }
};

/**
 * Send notification using JWT authentication (user access token)
 * This automatically identifies the user from their JWT token
 */
export const sendNotificationWithJWT = async (
  title: string,
  body: string,
  data?: any,
  sound: string = 'default',
  badge?: number
) => {
  try {
    // Get the current user's session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      console.error('No valid session found:', sessionError);
      return { success: false, error: 'No valid session found' };
    }

    console.log('Sending notification with JWT for user:', session.user.id);

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title,
          body,
          data,
          sound,
          badge,
          // Note: userId is not needed when using JWT - the edge function will extract it from the token
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send notification with JWT:', error);
      return { success: false, error };
    }

    const result = await response.json();
    console.log('Notification sent successfully with JWT:', result);
    return { success: true, ...result };
  } catch (error) {
    console.error('Error sending notification with JWT:', error);
    return { success: false, error };
  }
};

/**
 * Send notification to a specific user using JWT authentication
 * This validates that the authenticated user can send notifications to the specified user
 */
export const sendNotificationToUserWithJWT = async (
  targetUserId: string,
  title: string,
  body: string,
  data?: any,
  sound: string = 'default',
  badge?: number
) => {
  try {
    // Get the current user's session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      console.error('No valid session found:', sessionError);
      return { success: false, error: 'No valid session found' };
    }

    console.log('Sending notification with JWT to user:', targetUserId);

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          targetUserId: targetUserId, // Use the new parameter for sending to other users
          title,
          body,
          data,
          sound,
          badge,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send notification to user with JWT:', error);
      return { success: false, error };
    }

    const result = await response.json();
    console.log('Notification sent successfully to user with JWT:', result);
    return { success: true, ...result };
  } catch (error) {
    console.error('Error sending notification to user with JWT:', error);
    return { success: false, error };
  }
};

/**
 * Send notification via Edge Function directly from app
 * This bypasses the database HTTP limitation
 */
export async function sendNotificationViaEdgeFunction(
  targetUserId: string,
  title: string,
  body: string,
  data?: any
): Promise<boolean> {
  try {
    console.log(
      'Sending notification via Edge Function for user:',
      targetUserId
    );

    const response = await fetch(
      'https://qdpammoeepwgapqyfrrh.supabase.co/functions/v1/send-notification',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          targetUserId,
          title,
          body,
          data,
          sound: 'default',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge Function error:', errorText);
      return false;
    }

    const result = await response.json();
    console.log('Notification sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Error sending notification via Edge Function:', error);
    return false;
  }
}

/**
 * Send notification for new comment
 * This is called directly from the app when a comment is created
 */
export async function sendNewCommentNotification(
  claimId: string,
  commentId: string,
  commenterEmail: string,
  claimTitle: string
): Promise<void> {
  try {
    // Get the claim creator's ID
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('op_id')
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      console.error('Error fetching claim:', claimError);
      return;
    }

    // Don't notify if commenter is the claim creator
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && user.id === claim.op_id) {
      console.log('Commenter is claim creator, skipping notification');
      return;
    }

    // Send notification to claim creator
    await sendNotificationViaEdgeFunction(
      claim.op_id,
      'New Comment',
      'Someone commented on your claim',
      {
        type: 'new_comment',
        claim_id: claimId,
        comment_id: commentId,
      }
    );
  } catch (error) {
    console.error('Error sending new comment notification:', error);
  }
}

/**
 * Send notification for mention
 */
export const sendMentionNotification = async (
  claimId: string,
  commentId: string,
  mentionedUserId: string,
  mentionerUsername: string
) => {
  try {
    return await sendNotification(
      mentionedUserId,
      'You were mentioned',
      `${mentionerUsername} mentioned you in a comment`,
      {
        type: 'mention',
        claim_id: claimId,
        comment_id: commentId,
        mentioner_username: mentionerUsername,
      }
    );
  } catch (error) {
    console.error('Error sending mention notification:', error);
    return { success: false, error };
  }
};

/**
 * Send notification for reply
 */
export const sendReplyNotification = async (
  claimId: string,
  commentId: string,
  parentCommentId: string,
  replierUsername: string,
  parentCommenterId: string
) => {
  try {
    // Don't notify if replier is the parent commenter
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && user.id === parentCommenterId) {
      return { success: true, skipped: true };
    }

    return await sendNotification(
      parentCommenterId,
      'New Reply',
      `${replierUsername} replied to your comment`,
      {
        type: 'reply',
        claim_id: claimId,
        comment_id: commentId,
        parent_comment_id: parentCommentId,
      }
    );
  } catch (error) {
    console.error('Error sending reply notification:', error);
    return { success: false, error };
  }
};

/**
 * Send trending notification
 */
export const sendTrendingNotification = async (
  claimId: string,
  claimTitle: string,
  category: string,
  userIds: string[]
) => {
  try {
    const notifications = await Promise.all(
      userIds.map((targetUserId) =>
        sendNotification(
          targetUserId,
          'Trending Claim',
          `"${claimTitle}" is trending in ${category}`,
          {
            type: 'trending',
            claim_id: claimId,
            category,
            claim_title: claimTitle,
          }
        )
      )
    );

    return {
      success: true,
      sent: notifications.filter((n) => n.success).length,
      failed: notifications.filter((n) => !n.success).length,
    };
  } catch (error) {
    console.error('Error sending trending notifications:', error);
    return { success: false, error };
  }
};

/**
 * EXAMPLE USAGE FUNCTIONS
 * These show how to use the JWT authentication functions in different scenarios
 */

/**
 * Example: Send a notification to the current user (self-notification)
 * Useful for reminders, updates, etc.
 */
export const sendSelfNotification = async (
  title: string,
  body: string,
  data?: any
) => {
  return await sendNotificationWithJWT(title, body, data);
};

/**
 * Example: Send a notification when user creates a new claim
 * This sends a notification to the user who created the claim
 */
export const sendNewClaimNotificationToSelf = async (
  claimId: string,
  claimTitle: string,
  category: string
) => {
  return await sendNotificationWithJWT(
    'Claim Created!',
    `Your claim "${claimTitle}" in ${category} has been created successfully.`,
    {
      type: 'new_claim',
      claim_id: claimId,
      category: category,
    }
  );
};

/**
 * Example: Send a notification when user receives a comment on their claim
 * This would be called from your comment creation logic
 */
export const sendCommentNotificationToClaimOwner = async (
  claimOwnerId: string,
  claimTitle: string,
  commenterUsername: string
) => {
  return await sendNotificationToUserWithJWT(
    claimOwnerId,
    'New Comment',
    `${commenterUsername} commented on your claim "${claimTitle}"`,
    {
      type: 'new_comment',
      claim_title: claimTitle,
      commenter: commenterUsername,
    }
  );
};

/**
 * Example: Send a notification when user receives a reply to their comment
 * This would be called from your reply creation logic
 */
export const sendReplyNotificationToCommentOwner = async (
  commentOwnerId: string,
  claimTitle: string,
  replierUsername: string
) => {
  return await sendNotificationToUserWithJWT(
    commentOwnerId,
    'New Reply',
    `${replierUsername} replied to your comment on "${claimTitle}"`,
    {
      type: 'new_reply',
      claim_title: claimTitle,
      replier: replierUsername,
    }
  );
};

/**
 * Example: Send a notification when user is mentioned in a comment
 * This would be called from your comment creation logic when @mentions are detected
 */
export const sendMentionNotificationWithJWT = async (
  mentionedUserId: string,
  claimTitle: string,
  mentionerUsername: string
) => {
  return await sendNotificationToUserWithJWT(
    mentionedUserId,
    'You were mentioned',
    `${mentionerUsername} mentioned you in a comment on "${claimTitle}"`,
    {
      type: 'mention',
      claim_title: claimTitle,
      mentioner: mentionerUsername,
    }
  );
};

/**
 * COMPREHENSIVE USAGE EXAMPLE
 *
 * Here's how to integrate JWT notifications into your app components:
 *
 * // In your CreateClaim.tsx component:
 * import { sendNewClaimNotificationToSelf } from '@/lib/notificationHelpers';
 *
 * const handleCreateClaim = async () => {
 *   // ... create claim logic ...
 *
 *   // Send notification to self after successful creation
 *   await sendNewClaimNotificationToSelf(
 *     newClaim.id,
 *     newClaim.title,
 *     newClaim.category
 *   );
 * };
 *
 * // In your ClaimDetail.tsx component when adding comments:
 * import { sendCommentNotificationToClaimOwner } from '@/lib/notificationHelpers';
 *
 * const handleAddComment = async () => {
 *   // ... add comment logic ...
 *
 *   // Send notification to claim owner
 *   await sendCommentNotificationToClaimOwner(
 *     claim.op_id, // claim owner's user ID
 *     claim.title,
 *     currentUser.username
 *   );
 * };
 *
 * // In your comment reply logic:
 * import { sendReplyNotificationToCommentOwner } from '@/lib/notificationHelpers';
 *
 * const handleReplyToComment = async () => {
 *   // ... add reply logic ...
 *
 *   // Send notification to comment owner
 *   await sendReplyNotificationToCommentOwner(
 *     parentComment.user_id,
 *     claim.title,
 *     currentUser.username
 *   );
 * };
 *
 * // For mentions in comments:
 * import { sendMentionNotificationWithJWT } from '@/lib/notificationHelpers';
 *
 * const handleAddCommentWithMentions = async () => {
 *   // ... add comment logic ...
 *
 *   // Check for and send notifications
 *   const mentions = extractMentions(commentText); // Your mention extraction logic
 *   for (const mentionedUser of mentions) {
 *     await sendMentionNotificationWithJWT(
 *       mentionedUser.id,
 *       claim.title,
 *       currentUser.username
 *     );
 *   }
 * };
 */

/**
 * CLIENT-SIDE NOTIFICATION SYSTEM
 *
 * These functions send notifications directly from the iPhone app
 * No need for net.http or Supabase Pro account
 */

/**
 * Send notification to a specific user from the client
 * This is the main function to use for all client-side notifications
 */

/**
 * Send notification to multiple users from the client
 * Useful for broadcasting notifications to multiple users
 */

/**
 * CLIENT-SIDE NOTIFICATION FUNCTIONS FOR SPECIFIC SCENARIOS
 */

/**
 * Send notification when user creates a new claim
 * Notifies the claim creator that their claim was created successfully
 */

/**
 * Send notification when someone comments on a claim
 * Notifies the claim owner about the new comment
 */

/**
 * Send notification when someone replies to a comment
 * Notifies the comment owner about the reply
 */

/**
 * Send notification when someone mentions a user in a comment
 * Notifies the mentioned user about the mention
 */

/**
 * Send notification when a claim becomes trending
 * Notifies users who might be interested in the trending claim
 */

/**
 * Send notification when someone follows a user
 * Notifies the followed user about the new follower
 */

/**
 * Send notification when someone likes a claim
 * Notifies the claim owner about the like
 */
