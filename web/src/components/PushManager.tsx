'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell, ShieldCheck, XCircle } from 'lucide-react'

const VAPID_PUBLIC_KEY = 'BK-ZiqbWSyfXp4VAHzQ5RJeBsZ0TABjvsiK-hLBzMv8xZicbVRk5fHG5Z1fzfK9oJsAxixiRLelmbV8bXbyNGnk'

export default function PushManager({ userId }: { userId: string }) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    } else {
      setPermission('unsupported')
    }
  }, [])

  const subscribeToPush = async () => {
    setLoading(true)
    setError(null)
    try {
      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult)

      if (permissionResult !== 'granted') {
        throw new Error('Permission not granted for notifications')
      }

      const registration = await navigator.serviceWorker.register('/sw.js')
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      // Save to Supabase
      const { error: dbError } = await supabase
        .from('fcm_tokens')
        .upsert({
          user_id: userId,
          token: JSON.stringify(subscription),
          platform: 'web'
        }, { onConflict: 'token' })

      if (dbError) throw dbError

      console.log('Web Push Subscription saved successfully')
    } catch (err: any) {
      console.error('Push subscription failed:', err)
      setError(err.message || 'Failed to subscribe to push notifications')
    } finally {
      setLoading(false)
    }
  }

  if (permission === 'unsupported') return null
  if (permission === 'granted') return null // Already subscribed or blocked (user can change in browser settings)

  return (
    <div className="fixed bottom-24 md:bottom-12 right-6 md:right-12 z-50 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="bg-white border border-zinc-200 p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] max-w-sm flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center mb-4 border border-pink-100">
          <Bell size={24} className="text-pink-500 animate-bounce" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 mb-2">Enable Laptop Alerts</h3>
        <p className="text-zinc-500 text-xs mb-6 leading-relaxed">
          Stay on top of your schedule with real-time browser notifications even when the tab is closed.
        </p>
        
        {error && (
          <div className="flex items-center space-x-2 text-red-500 text-[10px] font-bold mb-4 uppercase tracking-widest">
            <XCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={subscribeToPush}
          disabled={loading}
          className="w-full py-3.5 bg-zinc-900 text-white rounded-xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-zinc-800 hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center shadow-lg"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <ShieldCheck size={16} className="mr-2" /> Enable Notifications
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
