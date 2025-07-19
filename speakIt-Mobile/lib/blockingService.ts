// Blocking Service for User Management
// Handles blocking and unblocking users

import { supabase } from './supabase';

export interface BlockedUser {
    blocked_user_id: string;
    created_at: string;
}

export interface BlockResult {
    success: boolean;
    error?: string;
}

// Block a user
export const blockUser = async (userToBlockId: string): Promise<BlockResult> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        // Check if trying to block yourself
        if (user.id === userToBlockId) {
            return { success: false, error: 'You cannot block yourself' };
        }

        // Call the database function to block the user
        const { error } = await supabase
            .rpc('block_user', {
                user_to_block: userToBlockId
            });

        if (error) {
            console.error('Error blocking user:', error);
            return { success: false, error: 'Failed to block user' };
        }

        return { success: true };

    } catch (error: any) {
        console.error('Error in blockUser:', error);
        return { success: false, error: 'An unexpected error occurred while blocking user' };
    }
};

// Unblock a user
export const unblockUser = async (userToUnblockId: string): Promise<BlockResult> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        // Call the database function to unblock the user
        const { error } = await supabase
            .rpc('unblock_user', {
                user_to_unblock: userToUnblockId
            });

        if (error) {
            console.error('Error unblocking user:', error);
            return { success: false, error: 'Failed to unblock user' };
        }

        return { success: true };

    } catch (error: any) {
        console.error('Error in unblockUser:', error);
        return { success: false, error: 'An unexpected error occurred while unblocking user' };
    }
};

// Get all users blocked by the current user
export const getBlockedUsers = async (): Promise<string[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return [];
        }

        // Call the database function to get blocked users
        const { data, error } = await supabase
            .rpc('get_blocked_users', {
                user_id_to_check: user.id
            });

        if (error) {
            console.error('Error getting blocked users:', error);
            return [];
        }

        // Extract the blocked user IDs from the result
        return data?.map((row: any) => row.blocked_user_id) || [];

    } catch (error) {
        console.error('Error in getBlockedUsers:', error);
        return [];
    }
};

// Check if a specific user is blocked by the current user
export const isUserBlocked = async (userIdToCheck: string): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return false;
        }

        // Call the database function to check if user is blocked
        const { data, error } = await supabase
            .rpc('is_user_blocked', {
                blocker_id: user.id,
                blocked_id: userIdToCheck
            });

        if (error) {
            console.error('Error checking if user is blocked:', error);
            return false;
        }

        return data || false;

    } catch (error) {
        console.error('Error in isUserBlocked:', error);
        return false;
    }
};

// Get claims excluding blocked users
export const getClaimsExcludingBlocked = async (category?: string) => {
    try {
        const { data, error } = await supabase
            .rpc('get_claims_excluding_blocked', {
                category_param: category || null
            });

        if (error) {
            console.error('Error getting claims excluding blocked:', error);
            return [];
        }

        return data || [];

    } catch (error) {
        console.error('Error in getClaimsExcludingBlocked:', error);
        return [];
    }
};

// Get comments excluding blocked users
export const getCommentsExcludingBlocked = async (claimId: string) => {
    try {
        const { data, error } = await supabase
            .rpc('get_comments_excluding_blocked', {
                claim_id_param: claimId
            });

        if (error) {
            console.error('Error getting comments excluding blocked:', error);
            return [];
        }

        return data || [];

    } catch (error) {
        console.error('Error in getCommentsExcludingBlocked:', error);
        return [];
    }
};

// Get users who have blocked the current user
export const getUsersWhoBlockedMe = async (): Promise<string[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return [];
        }

        // Call the database function to get users who blocked the current user
        const { data, error } = await supabase
            .rpc('get_users_who_blocked', {
                user_id_to_check: user.id
            });

        if (error) {
            console.error('Error getting users who blocked me:', error);
            return [];
        }

        // Extract the blocker user IDs from the result
        return data?.map((row: any) => row.blocker_user_id) || [];

    } catch (error) {
        console.error('Error in getUsersWhoBlockedMe:', error);
        return [];
    }
}; 