import { supabase } from './supabase';

/**
 * Send a push notification to a specific user
 */
export const sendNotification = async (
  userId: string,
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
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userId,
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
 * Send notification for new comment
 */
export const sendNewCommentNotification = async (
  claimId: string,
  commentId: string,
  commenterUsername: string,
  claimTitle: string
) => {
  try {
    // Get claim creator's user ID
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('op_id')
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      console.error('Error fetching claim:', claimError);
      return { success: false, error: 'Claim not found' };
    }

    // Don't notify if commenter is the claim creator
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === claim.op_id) {
      return { success: true, skipped: true };
    }

    return await sendNotification(
      claim.op_id,
      'New Comment',
      `${commenterUsername} commented on your claim`,
      {
        type: 'new_comment',
        claim_id: claimId,
        comment_id: commentId,
        claim_title: claimTitle,
      }
    );
  } catch (error) {
    console.error('Error sending new comment notification:', error);
    return { success: false, error };
  }
};

/**
 * Send notification for new claim in category
 */
export const sendNewClaimNotification = async (
  claimId: string,
  claimTitle: string,
  category: string,
  creatorUsername: string,
  userIds: string[]
) => {
  try {
    const notifications = await Promise.all(
      userIds.map(userId =>
        sendNotification(
          userId,
          'New Claim',
          `${creatorUsername} created a new claim in ${category}`,
          {
            type: 'new_claim',
            claim_id: claimId,
            category,
            claim_title: claimTitle,
          }
        )
      )
    );

    return {
      success: true,
      sent: notifications.filter(n => n.success).length,
      failed: notifications.filter(n => !n.success).length,
    };
  } catch (error) {
    console.error('Error sending new claim notifications:', error);
    return { success: false, error };
  }
};

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
    const { data: { user } } = await supabase.auth.getUser();
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
      userIds.map(userId =>
        sendNotification(
          userId,
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
      sent: notifications.filter(n => n.success).length,
      failed: notifications.filter(n => !n.success).length,
    };
  } catch (error) {
    console.error('Error sending trending notifications:', error);
    return { success: false, error };
  }
}; 