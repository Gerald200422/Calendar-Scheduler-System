import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "https://esm.sh/resend@2.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // @ts-ignore
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  // @ts-ignore
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  // @ts-ignore
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  const supabase = createClient(supabaseUrl!, supabaseServiceKey!)
  const resend = new Resend(resendApiKey!)

  const logToDb = async (level: string, message: string, metadata: any = {}) => {
    console.log(`[${level.toUpperCase()}] ${message}`, metadata)
    try {
      await supabase.from('processing_logs').insert([{ level, message, metadata }])
    } catch (e) {
      console.error("Failed to write to processing_logs", e)
    }
  }

  const runSweep = async () => {
    const now = new Date().toISOString()
    
    // Fetch pending notifications that are due
    const { data: pending, error: fetchError } = await supabase
      .from('notification_queue')
      .select(`
        *,
        profile:user_id(*),
        event:event_id(*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(10) // Small batches for high-frequency processing

    if (fetchError) {
      await logToDb('error', `Fetch Error: ${fetchError.message}`, fetchError)
      return { status: 'error', error: fetchError.message }
    }

    if (!pending || pending.length === 0) {
      return { status: 'idle', count: 0 }
    }

    const results = await Promise.all(pending.map(async (notif: any) => {
      try {
        const { event, profile } = notif
        if (!event) throw new Error(`Event not found for notification ${notif.id}`)

        const notificationType = profile?.notification_type || 'both'
        const userEmail = profile?.email || 'gerald.p@gmail.com'
        const userName = profile?.full_name || 'there'

        const startTimeStr = new Date(event.start_time).toLocaleString('en-US', {
          timeZone: 'Asia/Manila',
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })

        let sentEmail = false
        let sentPushCount = 0

        // 1. Send Email (via Resend)
        if (notificationType === 'email' || notificationType === 'both') {
          const emailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <div style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 30px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Event Reminder</h1>
              </div>
              <div style="padding: 40px 30px;">
                <p style="font-size: 16px; color: #4b5563; margin-top: 0;">Hi ${userName},</p>
                <p style="font-size: 16px; color: #4b5563; line-height: 1.6;">This is a friendly reminder for your upcoming event:</p>
                
                <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 25px 0;">
                  <h2 style="margin: 0 0 10px 0; color: #111827; font-size: 20px;">${event.title}</h2>
                  <p style="margin: 0; color: #6b7280; font-size: 15px;">
                    <span style="display: inline-block; margin-right: 8px;">📅</span> ${startTimeStr}
                  </p>
                  ${event.location ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 15px;"><span style="display: inline-block; margin-right: 8px;">📍</span> ${event.location}</p>` : ''}
                  ${event.description ? `<p style="margin: 15px 0 0 0; color: #374151; font-size: 15px; border-top: 1px solid #e5e7eb; padding-top: 15px;">${event.description}</p>` : ''}
                </div>

                <div style="text-align: center; margin-top: 35px;">
                  <a href="https://calendarschedulersystem.vercel.app/" style="background-color: #111827; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">Open Calendar</a>
                </div>
              </div>
              <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 13px; color: #9ca3af;">&copy; ${new Date().getFullYear()} Scheduler App. All rights reserved.</p>
              </div>
            </div>
          `

          const recipients = [userEmail];
          if (event.guest_email) recipients.push(event.guest_email);

          const { error: emailError } = await resend.emails.send({
            from: "Scheduler <notifications@resend.dev>",
            to: recipients,
            subject: `Reminder: ${event.title}`,
            html: emailHtml,
          })
          if (emailError) throw emailError
          sentEmail = true
        }

        // 2. Send Push Notification (Mobile & Web)
        if (notificationType === 'mobile' || notificationType === 'push' || notificationType === 'both') {
          const { data: tokens } = await supabase.from('fcm_tokens').select('token, platform').eq('user_id', notif.user_id)
          
          if (tokens && tokens.length > 0) {
            const expoTokens = tokens.filter(t => t.platform !== 'web').map(t => t.token)
            const webSubscriptions = tokens
              .filter(t => t.platform === 'web')
              .map(t => {
                try {
                  return JSON.parse(t.token)
                } catch (e) {
                  return null
                }
              })
              .filter(sub => sub !== null)

            // 2a. Expo (Mobile)
            if (expoTokens.length > 0) {
                const ringtone = profile?.ringtone_choice || 'samsung_alert.mp3'
                const pushData = expoTokens.map((token: string) => ({
                  to: token,
                  title: `📅 ${event.title}`,
                  body: `Starts at ${new Date(event.start_time).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })}.${event.location ? ` | 📍 ${event.location}` : ''}`,
                  data: { event_id: event.id, ringtone },
                  sound: ringtone.replace('.mp3', ''),
                  channelId: `v3-${ringtone.replace('.mp3', '')}`, // v3 to match App.tsx
                  categoryIdentifier: 'ALARM',
                  priority: 'high',
                }))
              await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pushData),
              })
              sentPushCount += expoTokens.length
            }

            // 2b. Web Push (Laptop & PWA)
            if (webSubscriptions.length > 0) {
              const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') || 'BK-ZiqbWSyfXp4VAHzQ5RJeBsZ0TABjvsiK-hLBzMv8xZicbVRk5fHG5Z1fzfK9oJsAxixiRLelmbV8bXbyNGnk'
              const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') || 'g-uviKcDRN0LEUfdaulzTZ5EAvk3qGV5m4jqZZm_0_U'
              const ringtone = profile?.ringtone_choice || 'samsung_alert.mp3'

              // We'll use a dynamic import for web-push to handle ESM in Deno
              // @ts-ignore
              const webpush = await import("https://esm.sh/web-push@3.6.6")
              
              webpush.setVapidDetails(
                'mailto:gerald.p@gmail.com',
                VAPID_PUBLIC,
                VAPID_PRIVATE
              )

              for (const sub of webSubscriptions) {
                try {
                  const payload = JSON.stringify({
                    title: `📅 ${event.title}`,
                    body: `Starts at ${new Date(event.start_time).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })}.${event.location ? ` | 📍 ${event.location}` : ''}`,
                    data: { 
                      url: 'https://calendarschedulersystem.vercel.app/',
                      ringtone 
                    },
                    actions: [
                      { action: 'stop', title: 'Stop Alarm 🛑' }
                    ]
                  })

                  await webpush.sendNotification(sub, payload)
                  sentPushCount++
                  await logToDb('info', `Web Push delivered to ${sub.endpoint.slice(0, 30)}...`)
                } catch (e: any) {
                  console.error('Web push failed for subscription', e)
                  await logToDb('error', `Web Push failed for ${sub.endpoint.slice(0, 30)}...: ${e.message}`)
                }
              }
            }
          }
        }

        // 3. Complete notification status
        await supabase.from('notification_queue').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', notif.id)
        return { id: notif.id, status: 'success', sentEmail, sentPushCount }
      } catch (err: any) {
        await logToDb('error', `Failed processing ${notif.id}: ${err.message}`, { error: err })
        await supabase.from('notification_queue').update({ status: 'failed' }).eq('id', notif.id)
        return { id: notif.id, status: 'failed', error: err.message }
      }
    }))

    return { status: 'processed', count: results.length, results }
  }

  try {
    const startTime = Date.now()
    const maxDuration = 50000 // Run for 50 seconds to allow for 60-second cron
    let sweeps = 0
    let processedCount = 0

    await logToDb('info', `Starting high-frequency sweep session.`)

    while (Date.now() - startTime < maxDuration) {
      sweeps++
      const sweepResult = await runSweep()
      if (sweepResult.status === 'processed') {
        processedCount += sweepResult.count
      }
      // Wait 1 second before next sweep
      await delay(1000)
    }

    await logToDb('info', `High-frequency session completed. Sweeps: ${sweeps}, Processed: ${processedCount}.`)

    return new Response(JSON.stringify({ message: 'High-frequency session completed', sweeps, processedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(errorMsg)
    return new Response(JSON.stringify({ error: errorMsg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
