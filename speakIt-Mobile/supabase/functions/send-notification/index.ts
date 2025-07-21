import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  userId: string;
  title: string;
  body: string;
  data?: any;
  sound?: string;
  badge?: number;
}

interface PushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data?: any;
  badge?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse the request body
    const { userId, title, body, data, sound = 'default', badge }: NotificationRequest = await req.json()

    // Validate required fields
    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user's push tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token, device_type')
      .eq('user_id', userId)

    if (tokenError) {
      console.error('Error fetching push tokens:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No push tokens found for user' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    // Prepare push messages for all user's devices
    const messages: PushMessage[] = tokens.map(token => ({
      to: token.token,
      sound,
      title,
      body,
      data,
      badge,
    }))

    // Send notifications via Expo Push API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })

    if (!expoResponse.ok) {
      const expoError = await expoResponse.text()
      console.error('Expo push API error:', expoError)
      return new Response(
        JSON.stringify({ error: 'Failed to send push notification' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    const expoResult = await expoResponse.json()

    // Check for any errors in the response
    const errors = expoResult.data?.filter((result: any) => result.status === 'error')
    if (errors && errors.length > 0) {
      console.error('Some notifications failed:', errors)
      
      // Remove invalid tokens
      for (const error of errors) {
        if (error.details?.error === 'DeviceNotRegistered') {
          const invalidToken = error.details.expoPushToken
          await supabase
            .from('push_tokens')
            .delete()
            .eq('token', invalidToken)
        }
      }
    }

    // Log successful notifications
    console.log(`Sent ${messages.length} notifications to user ${userId}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: messages.length,
        errors: errors?.length || 0,
        expoResult 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in send-notification function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
