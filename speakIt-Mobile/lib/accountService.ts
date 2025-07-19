// Account Service for user account management
// Handles account deletion and data cleanup

import { supabase } from './supabase';

export interface DeleteAccountResult {
    success: boolean;
    error?: string;
    requiresAdmin?: boolean;
}

// Delete user account and all associated data
export const deleteUserAccount = async (password: string): Promise<DeleteAccountResult> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        // Step 1: Get user's email for re-authentication
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser?.email) {
            return { success: false, error: 'Unable to get user email' };
        }

        // Step 2: Re-authenticate user with password (required for account deletion)
        const { error: reAuthError } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: password
        });

        if (reAuthError) {
            return { success: false, error: 'Incorrect password' };
        }

        // Step 3: Delete all user data using the database function
        const userId = user.id;

        // Call the database function to delete all user data
        const { error: deleteDataError } = await supabase
            .rpc('delete_user_account', {
                user_id_to_delete: userId
            });

        if (deleteDataError) {
            console.error('Error deleting user data:', deleteDataError);
            return { success: false, error: 'Failed to delete user data. Please contact support.' };
        }

        // Step 4: Handle auth account deletion
        // Since client-side admin.deleteUser requires special privileges,
        // we'll use an alternative approach
        
        try {
            // Try to delete the auth user (this might work in some configurations)
            const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
            
            if (deleteError) {
                console.log('Auth account deletion requires admin privileges');
                // Return success but indicate that admin assistance might be needed
                return { 
                    success: true, 
                    requiresAdmin: true,
                    error: 'Your data has been deleted, but complete account removal may require admin assistance.'
                };
            }
        } catch (error) {
            console.log('Auth deletion failed, but data was cleaned up');
            return { 
                success: true, 
                requiresAdmin: true,
                error: 'Your data has been deleted, but complete account removal may require admin assistance.'
            };
        }

        return { success: true };

    } catch (error: any) {
        console.error('Error in deleteUserAccount:', error);
        return { success: false, error: 'An unexpected error occurred while deleting your account' };
    }
};

// Check if user has any content before deletion
export const getUserContentSummary = async (): Promise<{
    claimsCount: number;
    commentsCount: number;
    flagsCount: number;
} | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return null;
        }

        const userId = user.id;

        // Use the database function to get content summary
        const { data, error } = await supabase
            .rpc('get_user_content_summary', {
                user_id_to_check: userId
            });

        if (error) {
            console.error('Error getting user content summary:', error);
            return null;
        }

        // The function returns a single row with the counts
        const summary = data?.[0];
        if (!summary) {
            return {
                claimsCount: 0,
                commentsCount: 0,
                flagsCount: 0
            };
        }

        return {
            claimsCount: Number(summary.claims_count) || 0,
            commentsCount: Number(summary.comments_count) || 0,
            flagsCount: Number(summary.flags_count) || 0
        };

    } catch (error) {
        console.error('Error getting user content summary:', error);
        return null;
    }
}; 