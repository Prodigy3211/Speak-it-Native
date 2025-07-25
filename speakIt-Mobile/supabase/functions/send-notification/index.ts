import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  console.log('=== NOTIFICATION FUNCTION CALLED ===')
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate authorization header (anon key)
    const authHeader = req.headers.get('authorization')
    const expectedAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!authHeader || !expectedAnonKey || !authHeader.startsWith('Bearer ') || 
        authHeader.replace('Bearer ', '') !== expectedAnonKey) {
      console.error('Invalid or missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Parse the request body
    const body = await req.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    const { userId, title, body: messageBody, data, sound = 'default', badge }: NotificationRequest = body

    // Validate required fields
    if (!userId || !title || !messageBody) {
      console.error('Missing required fields:', { userId, title, messageBody })
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log('Processing notification for user:', userId)

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey })
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user's push tokens
    console.log('Fetching push tokens for user:', userId)
    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token, device_type')
      .eq('user_id', userId)

    if (tokenError) {
      console.error('Error fetching push tokens:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens', details: tokenError }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    console.log('Found tokens:', tokens?.length || 0)

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for user:', userId)
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
      body: messageBody,
      data,
      badge,
    }))

    console.log('Prepared messages:', messages.length)
    console.log('Sending to Expo Push API...')

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

    console.log('Expo response status:', expoResponse.status)

    if (!expoResponse.ok) {
      const expoError = await expoResponse.text()
      console.error('Expo push API error:', expoError)
      return new Response(
        JSON.stringify({ error: 'Failed to send push notification', details: expoError }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    const expoResult = await expoResponse.json()
    console.log('Expo result:', JSON.stringify(expoResult, null, 2))

    // Check for any errors in the response
    const errors = expoResult.data?.filter((result: any) => result.status === 'error')
    if (errors && errors.length > 0) {
      console.error('Some notifications failed:', errors)
      
      // Remove invalid tokens
      for (const error of errors) {
        if (error.details?.error === 'DeviceNotRegistered') {
          const invalidToken = error.details.expoPushToken
          console.log('Removing invalid token:', invalidToken)
          await supabase
            .from('push_tokens')
            .delete()
            .eq('token', invalidToken)
        }
      }
    }

    // Log successful notifications
    console.log(`✅ Successfully sent ${messages.length} notifications to user ${userId}`)

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
    console.error('❌ Error in send-notification function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
