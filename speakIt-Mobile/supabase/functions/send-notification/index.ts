import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId?: string; // Optional when using JWT
  title: string;
  body: string;
  data?: any;
  sound?: string;
  badge?: number;
  targetUserId?: string; // New field for sending notifications to other users
}

Deno.serve(async (req) => {
  console.log('=== NOTIFICATION FUNCTION CALLED ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const expectedAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    // Create Supabase client with service role key (new format)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') ?? '',
            apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          },
        },
      }
    );

    // Parse the request body
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    const {
      userId,
      title,
      body: messageBody,
      data,
      sound = 'default',
      badge,
      targetUserId: requestTargetUserId,
    }: NotificationRequest = body;

    // Validate required fields
    if (!title || !messageBody) {
      console.error('Missing required fields: title, body');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, body' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    let targetUserId = userId;

    // Check if token is JWT (user access token) or anon key
    if (token === expectedAnonKey) {
      // Using anonymous key - userId must be provided
      if (!userId) {
        console.error('userId required when using anonymous key');
        return new Response(
          JSON.stringify({ error: 'userId required when using anonymous key' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      console.log('Using anonymous key authentication for user:', userId);
    } else {
      // Using JWT - verify and extract user ID
      try {
        const {
          data: { user },
          error: jwtError,
        } = await supabaseClient.auth.getUser(token);

        if (jwtError || !user) {
          console.error('Invalid JWT token:', jwtError);
          return new Response(JSON.stringify({ error: 'Invalid JWT token' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          });
        }

        // Handle different notification scenarios
        if (requestTargetUserId) {
          // User is sending notification to another user (e.g., comment notifications)
          // Validate that the authenticated user is not sending to themselves
          if (requestTargetUserId === user.id) {
            console.error('Cannot send notification to yourself');
            return new Response(
              JSON.stringify({
                error: 'Cannot send notification to yourself',
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
              }
            );
          }
          targetUserId = requestTargetUserId;
          console.log('Sending notification to another user:', targetUserId);
        } else if (!userId) {
          // User is sending notification to themselves
          targetUserId = user.id;
          console.log('Using JWT user ID:', targetUserId);
        } else if (userId !== user.id) {
          // Legacy case: userId provided but doesn't match JWT
          console.error('userId does not match JWT user ID');
          return new Response(
            JSON.stringify({
              error: 'userId does not match authenticated user',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 403,
            }
          );
        } else {
          // Legacy case: userId matches JWT
          targetUserId = userId;
          console.log(
            'Using provided userId (validated against JWT):',
            targetUserId
          );
        }
      } catch (error) {
        console.error('Error verifying JWT:', error);
        return new Response(JSON.stringify({ error: 'Invalid JWT token' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        });
      }
    }

    console.log('Processing notification for user:', targetUserId);

    // Get user's push tokens
    console.log('Fetching push tokens for user:', targetUserId);
    const { data: tokens, error: tokenError } = await supabaseClient
      .from('push_tokens')
      .select('token, device_type')
      .eq('user_id', targetUserId);

    if (tokenError) {
      console.error('Error fetching push tokens:', tokenError);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch push tokens',
          details: tokenError,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('Found tokens:', tokens?.length || 0);

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for user:', targetUserId);
      return new Response(
        JSON.stringify({ error: 'No push tokens found for user' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Prepare push messages for all user's devices
    const messages = tokens.map((token) => ({
      to: token.token,
      sound,
      title,
      body: messageBody,
      data,
      badge,
    }));

    console.log('Prepared messages:', messages.length);
    console.log('Sending to Expo Push API...');

    // Send notifications via Expo Push API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    console.log('Expo response status:', expoResponse.status);

    if (!expoResponse.ok) {
      const expoError = await expoResponse.text();
      console.error('Expo push API error:', expoError);
      return new Response(
        JSON.stringify({
          error: 'Failed to send push notification',
          details: expoError,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const expoResult = await expoResponse.json();
    console.log('Expo result:', JSON.stringify(expoResult, null, 2));

    // Check for any errors in the response
    const errors = expoResult.data?.filter(
      (result: any) => result.status === 'error'
    );
    if (errors && errors.length > 0) {
      console.error('Some notifications failed:', errors);

      // Remove invalid tokens
      for (const error of errors) {
        if (error.details?.error === 'DeviceNotRegistered') {
          const invalidToken = error.details.expoPushToken;
          console.log('Removing invalid token:', invalidToken);
          await supabaseClient
            .from('push_tokens')
            .delete()
            .eq('token', invalidToken);
        }
      }
    }

    // Log successful notifications
    console.log(
      `✅ Successfully sent ${messages.length} notifications to user ${targetUserId}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        sent: messages.length,
        errors: errors?.length || 0,
        expoResult,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
