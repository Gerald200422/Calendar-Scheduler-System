'use client'

import React, { useState, useEffect } from 'react'
import Calendar from '@/components/Calendar'
import Dashboard from '@/components/Dashboard'
import Settings from '@/components/Settings'
import Auth from '@/components/Auth'
import PushManager from '@/components/PushManager'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export default function Home() {
  const [activeTab, setActiveTab] = useState('calendar')
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [pstTime, setPstTime] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // Local Clock for PST
    const updateTime = () => {
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila'
      })
      setPstTime(formatter.format(now))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-12 bg-zinc-50 text-zinc-900">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-pink-500/5 blur-[120px] rounded-full" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-violet-500/5 blur-[120px] rounded-full" />
        </div>
        <div className="z-10 w-full max-w-4xl">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="Logo" className="w-24 h-24 rounded-[2rem] shadow-2xl ring-4 ring-pink-500/20" />
          </div>
          <div className="text-center mb-12">
            <h1 className="text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-zinc-900 to-zinc-500 bg-clip-text text-transparent">
              Scheduler Pro
            </h1>
            <p className="text-zinc-400 text-lg">Your intelligent companion for seamless event scheduling.</p>
          </div>
          <Auth />
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-24 md:pb-12 transition-colors">
      {/* Header (Matching Image) */}
      <div className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-0 z-[100] transition-colors">
        <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-12">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Scheduler Pro</h1>
            <nav className="hidden md:flex items-center space-x-6 h-full">
              {['dashboard', 'calendar', 'settings'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "capitalize h-20 px-1 flex items-center text-sm font-bold transition-all relative",
                    activeTab === tab ? "text-violet-600 dark:text-violet-400" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-violet-600 dark:bg-violet-400 rounded-t-full" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-8">
            <div className="flex flex-col items-end">
              <p className="text-[9px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest leading-none mb-1">
                Philippine Standard Time
              </p>
              <p className="text-sm font-mono font-bold text-zinc-900 dark:text-white tabular-nums">
                {pstTime || '00:00:00 PM'}
              </p>
            </div>

            <div className="flex items-center space-x-6 border-l border-zinc-200 dark:border-zinc-800 pl-8">
              <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
              </button>

              <div className="flex items-center space-x-3 group cursor-pointer border-l border-zinc-200 dark:border-zinc-800 pl-6 py-2">
                <div className="flex flex-col items-end">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{session.user.email}</p>
                  <button onClick={handleSignOut} className="text-[10px] font-black text-zinc-400 hover:text-red-500 uppercase tracking-widest">Sign Out</button>
                </div>
                <div className="w-10 h-10 rounded-full bg-violet-600 dark:bg-violet-500 flex items-center justify-center text-white font-black shadow-lg">
                  {session.user.email?.[0].toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>
      </div>

      <div className="z-10 max-w-7xl w-full flex flex-col space-y-8 md:space-y-12 p-6 md:p-10">

        <section className="w-full">
          {activeTab === 'dashboard' ? (
            <Dashboard userId={session.user.id} />
          ) : activeTab === 'calendar' ? (
            <Calendar userId={session.user.id} />
          ) : (
            <Settings userId={session.user.id} />
          )}
        </section>

        {/* Browser Push Notification Manager */}
        <PushManager userId={session.user.id} />
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
        <nav className="flex items-center justify-around p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-xl transition-colors">
          {[
            { id: 'dashboard', label: 'Home' },
            { id: 'calendar', label: 'Calendar' },
            { id: 'settings', label: 'Settings' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center space-y-1 transition-all",
                activeTab === item.id ? "text-violet-600 dark:text-violet-400 scale-110" : "text-zinc-400 dark:text-zinc-600"
              )}
            >
              <div className={cn(
                "w-1 h-1 rounded-full mb-1 transition-all",
                activeTab === item.id ? "bg-violet-600 dark:bg-violet-400" : "bg-transparent"
              )} />
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </main>
  )
}
