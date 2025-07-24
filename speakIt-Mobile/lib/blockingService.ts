// Blocking Service for User Management
// Handles blocking and unblocking users with direct queries

import { supabase } from './supabase';

export interface BlockedUser {
    blocked_user_id: string;
    created_at: string;
}

export interface BlockResult {
    success: boolean;
    error?: string;
}

// Cache for blocked users to reduce database calls
let blockedUsersCache: string[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (increased from 5)

// Debounce mechanism to prevent rapid calls
let lastCallTime = 0;
const DEBOUNCE_DELAY = 5000; // 5 seconds (increased from 1)

// Flag to prevent multiple simultaneous calls
let isFetching = false;

// Temporary flag to disable blocking service until permissions are fixed
let isBlockingServiceEnabled = false; // Set to true after running the SQL script

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

        // Check if already blocked
        const { data: existingBlock } = await supabase
            .from('user_blocks')
            .select('*')
            .eq('blocker_user_id', user.id)
            .eq('blocked_user_id', userToBlockId)
            .single();

        if (existingBlock) {
            return { success: true }; // Already blocked, consider it successful
        }

        // Insert the block
        const { error } = await supabase
            .from('user_blocks')
            .insert({
                blocker_user_id: user.id,
                blocked_user_id: userToBlockId
            });

        if (error) {
            console.error('Error blocking user:', error);
            // If it's a permission error, log it but don't fail the app
            if (error.code === '42501') {
                console.warn('Permission denied for user_blocks table - blocking operation failed');
                return { success: false, error: 'Blocking is not available at this time' };
            }
            return { success: false, error: 'Failed to block user' };
        }

        // Clear cache after successful block
        clearBlockedUsersCache();
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

        // Remove the block
        const { error } = await supabase
            .from('user_blocks')
            .delete()
            .eq('blocker_user_id', user.id)
            .eq('blocked_user_id', userToUnblockId);

        if (error) {
            console.error('Error unblocking user:', error);
            // If it's a permission error, log it but don't fail the app
            if (error.code === '42501') {
                console.warn('Permission denied for user_blocks table - unblocking operation failed');
                return { success: false, error: 'Unblocking is not available at this time' };
            }
            return { success: false, error: 'Failed to unblock user' };
        }

        // Clear cache after successful unblock
        clearBlockedUsersCache();
        return { success: true };

    } catch (error: any) {
        console.error('Error in unblockUser:', error);
        return { success: false, error: 'An unexpected error occurred while unblocking user' };
    }
};

// Get all users blocked by the current user
export const getBlockedUsers = async (): Promise<string[]> => {
    try {
        // If blocking service is disabled, return empty array
        if (!isBlockingServiceEnabled) {
            return [];
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return [];
        }

        // Check cache first
        const now = Date.now();
        if (now - cacheTimestamp < CACHE_DURATION && blockedUsersCache.length >= 0) {
            return blockedUsersCache;
        }

        // Debounce rapid calls
        if (now - lastCallTime < DEBOUNCE_DELAY) {
            return blockedUsersCache.length > 0 ? blockedUsersCache : [];
        }

        // Prevent multiple simultaneous calls
        if (isFetching) {
            return blockedUsersCache.length > 0 ? blockedUsersCache : [];
        }

        isFetching = true;
        lastCallTime = now;

        const { data, error } = await supabase
            .from('user_blocks')
            .select('blocked_user_id')
            .eq('blocker_user_id', user.id);

        if (error) {
            console.error('Error getting blocked users:', error);
            // If it's a permission error, return cached data or empty array
            if (error.code === '42501') {
                console.warn('Permission denied for user_blocks table - using cached data or empty list');
                return blockedUsersCache.length > 0 ? blockedUsersCache : [];
            }
            return [];
        }

        // Update cache
        blockedUsersCache = data?.map(row => row.blocked_user_id) || [];
        cacheTimestamp = now;
        return blockedUsersCache;

    } catch (error) {
        console.error('Error in getBlockedUsers:', error);
        return blockedUsersCache.length > 0 ? blockedUsersCache : [];
    } finally {
        isFetching = false;
    }
};

// Clear cache when blocking/unblocking users
const clearBlockedUsersCache = () => {
    blockedUsersCache = [];
    cacheTimestamp = 0;
};

// Function to enable blocking service after permissions are fixed
export const enableBlockingService = () => {
    isBlockingServiceEnabled = true;
    clearBlockedUsersCache();
    console.log('Blocking service enabled');
};

// Check if a specific user is blocked by the current user
export const isUserBlocked = async (userIdToCheck: string): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return false;
        }

        const { data, error } = await supabase
            .from('user_blocks')
            .select('*')
            .eq('blocker_user_id', user.id)
            .eq('blocked_user_id', userIdToCheck)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
            console.error('Error checking if user is blocked:', error);
            // If it's a permission error, return false instead of failing
            if (error.code === '42501') {
                console.warn('Permission denied for user_blocks table - assuming user is not blocked');
                return false;
            }
            return false;
        }

        return !!data;

    } catch (error) {
        console.error('Error in isUserBlocked:', error);
        return false;
    }
};

// Get claims excluding blocked users
export const getClaimsExcludingBlocked = async (category?: string) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            // If not authenticated, return all claims
            let query = supabase
                .from('claims')
                .select('*')
                .order('created_at', { ascending: false });

            if (category) {
                query = query.eq('category', category);
            }

            const { data, error } = await query;
            if (error) {
                console.error('Error getting claims:', error);
                return [];
            }
            return data || [];
        }

        // Get blocked users
        const blockedUsers = await getBlockedUsers();
        
        // Build query
        let query = supabase
            .from('claims')
            .select('*')
            .order('created_at', { ascending: false });

        if (category) {
            query = query.eq('category', category);
        }

        // Exclude blocked users' claims
        if (blockedUsers.length > 0) {
            query = query.not('op_id', 'in', `(${blockedUsers.map(id => `'${id}'`).join(',')})`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error getting claims:', error);
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            // If not authenticated, return all comments
            const { data, error } = await supabase
                .from('comments')
                .select('*')
                .eq('claim_id', claimId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error getting comments:', error);
                return [];
            }
            return data || [];
        }

        // Get blocked users
        const blockedUsers = await getBlockedUsers();
        
        // Build query
        let query = supabase
            .from('comments')
            .select('*')
            .eq('claim_id', claimId)
            .order('created_at', { ascending: true });

        // Exclude blocked users' comments
        if (blockedUsers.length > 0) {
            query = query.not('user_id', 'in', `(${blockedUsers.map(id => `'${id}'`).join(',')})`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error getting comments:', error);
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

        const { data, error } = await supabase
            .from('user_blocks')
            .select('blocker_user_id')
            .eq('blocked_user_id', user.id);

        if (error) {
            console.error('Error getting users who blocked me:', error);
            return [];
        }

        return data?.map(row => row.blocker_user_id) || [];

    } catch (error) {
        console.error('Error in getUsersWhoBlockedMe:', error);
        return [];
    }
}; 