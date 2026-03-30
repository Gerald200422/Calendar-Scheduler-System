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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-12 bg-[#0a0a0a] text-white">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-pink-500/10 blur-[120px] rounded-full" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-violet-500/10 blur-[120px] rounded-full" />
        </div>
        <div className="z-10 w-full max-w-4xl">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="Logo" className="w-24 h-24 rounded-[2rem] shadow-2xl ring-4 ring-pink-500/20" />
          </div>
          <div className="text-center mb-12">
            <h1 className="text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
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
    <main className="flex min-h-screen flex-col items-center justify-start p-4 md:p-12 bg-[#0a0a0a] text-white pb-24 md:pb-12">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-pink-500/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-violet-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="z-10 max-w-6xl w-full flex flex-col space-y-8 md:space-y-12">
        <header className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shadow-lg cursor-pointer overflow-hidden border border-white/10" onClick={() => setActiveTab('calendar')}>
                <img src="/logo.png" alt="S" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
                Scheduler Pro
              </h1>
            </div>
            {/* Mobile Sign Out */}
            <button 
              onClick={handleSignOut}
              className="sm:hidden p-2 text-zinc-500 hover:text-pink-500 transition-colors"
            >
              Sign Out
            </button>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-zinc-400 bg-white/5 px-6 py-2 rounded-2xl border border-white/5 backdrop-blur-md">
            {['dashboard', 'calendar', 'settings'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "capitalize transition-colors hover:text-white",
                  activeTab === tab ? "text-white font-bold" : ""
                )}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="flex items-center justify-between w-full sm:w-auto space-x-6">
            <div className="flex flex-col items-center sm:items-end flex-1 sm:flex-none">
              <p className="text-[9px] md:text-[10px] font-black text-pink-500 uppercase tracking-[0.2em] leading-none mb-1">
                Philippine Standard Time
              </p>
              <p className="text-sm md:text-lg font-mono font-bold text-white tabular-nums leading-none">
                {pstTime || '--:--:-- --'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-xs text-zinc-500 text-right hidden lg:block">
                <p className="font-medium text-zinc-300">{session.user.email}</p>
                <button 
                  onClick={handleSignOut}
                  className="hover:text-pink-500 transition-colors"
                >
                  Sign Out
                </button>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold overflow-hidden shadow-lg">
                {session.user.email?.[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

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
        <nav className="flex items-center justify-around p-4 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
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
                activeTab === item.id ? "text-pink-500 scale-110" : "text-zinc-500"
              )}
            >
              <div className={cn(
                "w-1 h-1 rounded-full mb-1 transition-all",
                activeTab === item.id ? "bg-pink-500" : "bg-transparent"
              )} />
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </main>
  )
}
