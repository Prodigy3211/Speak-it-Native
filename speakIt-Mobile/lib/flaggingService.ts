// Flagging Service for Content Moderation
// Handles all flagging operations with Supabase

import { supabase } from './supabase';

export interface FlaggedContent {
    id: string;
    content_id: string;
    content_type: 'claim' | 'comment';
    flagged_by_user_id: string;
    flag_reason: string;
    flag_description?: string;
    content_text: string;
    content_author_id?: string;
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
    reviewed_by_user_id?: string;
    reviewed_at?: string;
    review_notes?: string;
    action_taken?: string;
    created_at: string;
    updated_at: string;
}

export interface FlaggingStats {
    total_flags: number;
    unique_flaggers: number;
    flag_reasons: Record<string, number>;
    first_flagged_at: string;
    last_flagged_at: string;
}

export interface CreateFlagData {
    contentId: string;
    contentType: 'claim' | 'comment';
    flagReason: string;
    flagDescription?: string;
    contentText: string;
    contentAuthorId?: string;
}

// Flag content
export const flagContent = async (flagData: CreateFlagData): Promise<{ success: boolean; error?: string }> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        // Note: The database now has a unique constraint on (content_id, flagged_by_user_id)
        // This will automatically prevent duplicate flags from the same user

        // Create the flag
        const { error } = await supabase
            .from('flagged_content')
            .insert({
                content_id: flagData.contentId,
                content_type: flagData.contentType,
                flagged_by_user_id: user.id,
                flag_reason: flagData.flagReason,
                flag_description: flagData.flagDescription,
                content_text: flagData.contentText,
                content_author_id: flagData.contentAuthorId,
                status: 'pending'
            });

        if (error) {
            console.error('Error flagging content:', error);
            
            // Check if it's a duplicate flag error
            if (error.code === '23505') { // Unique constraint violation
                return { success: false, error: 'You have already flagged this content' };
            }
            
            return { success: false, error: 'Failed to flag content' };
        }

        return { success: true };
    } catch (error) {
        console.error('Error in flagContent:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
};

// Get flagging statistics for content
export const getContentFlagStats = async (contentId: string): Promise<FlaggingStats | null> => {
    try {
        const { data, error } = await supabase
            .rpc('get_content_flag_stats', { content_id_param: contentId });

        if (error) {
            console.error('Error getting flag stats:', error);
            return null;
        }

        if (data && data.length > 0) {
            return data[0] as FlaggingStats;
        }

        return null;
    } catch (error) {
        console.error('Error in getContentFlagStats:', error);
        return null;
    }
};

// Get user's own flags
export const getUserFlags = async (): Promise<FlaggedContent[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return [];
        }

        const { data, error } = await supabase
            .from('flagged_content')
            .select('*')
            .eq('flagged_by_user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error getting user flags:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getUserFlags:', error);
        return [];
    }
};

// Check if user has flagged specific content
export const hasUserFlaggedContent = async (contentId: string): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return false;
        }

        const { data, error } = await supabase
            .from('flagged_content')
            .select('id')
            .eq('content_id', contentId)
            .eq('flagged_by_user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error checking if user flagged content:', error);
            return false;
        }

        return !!data;
    } catch (error) {
        console.error('Error in hasUserFlaggedContent:', error);
        return false;
    }
};

// Admin functions (only for admin users)
export const getAllFlags = async (): Promise<FlaggedContent[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return [];
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('user_id', user.id)
            .single();

        if (!profile?.is_admin) {
            console.error('User is not admin');
            return [];
        }

        const { data, error } = await supabase
            .from('flagged_content')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error getting all flags:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getAllFlags:', error);
        return [];
    }
};

// Update flag status (admin only)
export const updateFlagStatus = async (
    flagId: string, 
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
    reviewNotes?: string,
    actionTaken?: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('user_id', user.id)
            .single();

        if (!profile?.is_admin) {
            return { success: false, error: 'User is not admin' };
        }

        const { error } = await supabase
            .from('flagged_content')
            .update({
                status,
                reviewed_by_user_id: user.id,
                reviewed_at: new Date().toISOString(),
                review_notes: reviewNotes,
                action_taken: actionTaken,
                updated_at: new Date().toISOString()
            })
            .eq('id', flagId);

        if (error) {
            console.error('Error updating flag status:', error);
            return { success: false, error: 'Failed to update flag status' };
        }

        return { success: true };
    } catch (error) {
        console.error('Error in updateFlagStatus:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
};

// Get flagging analytics (admin only)
export const getFlaggingAnalytics = async (): Promise<{
    totalFlags: number;
    pendingFlags: number;
    resolvedFlags: number;
    dismissedFlags: number;
    flagsByReason: Record<string, number>;
} | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return null;
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('user_id', user.id)
            .single();

        if (!profile?.is_admin) {
            console.error('User is not admin');
            return null;
        }

        // Get total flags
        const { count: totalFlags } = await supabase
            .from('flagged_content')
            .select('*', { count: 'exact', head: true });

        // Get flags by status
        const { count: pendingFlags } = await supabase
            .from('flagged_content')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        const { count: resolvedFlags } = await supabase
            .from('flagged_content')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'resolved');

        const { count: dismissedFlags } = await supabase
            .from('flagged_content')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'dismissed');

        // Get flags by reason
        const { data: flagsByReasonData } = await supabase
            .from('flagged_content')
            .select('flag_reason');

        const flagsByReason: Record<string, number> = {};
        flagsByReasonData?.forEach(flag => {
            flagsByReason[flag.flag_reason] = (flagsByReason[flag.flag_reason] || 0) + 1;
        });

        return {
            totalFlags: totalFlags || 0,
            pendingFlags: pendingFlags || 0,
            resolvedFlags: resolvedFlags || 0,
            dismissedFlags: dismissedFlags || 0,
            flagsByReason
        };
    } catch (error) {
        console.error('Error in getFlaggingAnalytics:', error);
        return null;
    }
}; 