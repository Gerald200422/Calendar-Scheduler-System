'use client'

import React, { useState, useEffect } from 'react'
import Calendar from '@/components/Calendar'
import Dashboard from '@/components/Dashboard'
import Settings from '@/components/Settings'
import Auth from '@/components/Auth'
import { supabase } from '@/lib/supabase'

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
    <main className="flex min-h-screen flex-col items-center justify-start p-12 bg-[#0a0a0a] text-white">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-pink-500/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-violet-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="z-10 max-w-6xl w-full flex flex-col space-y-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shadow-lg cursor-pointer overflow-hidden border border-white/10" onClick={() => setActiveTab('calendar')}>
              <img src="/logo.png" alt="S" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
              Scheduler Pro
            </h1>
          </div>
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-zinc-400">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`hover:text-white transition-colors ${activeTab === 'dashboard' ? 'text-white' : ''}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('calendar')}
              className={`hover:text-white transition-colors ${activeTab === 'calendar' ? 'text-white' : ''}`}
            >
              Calendar
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`hover:text-white transition-colors ${activeTab === 'settings' ? 'text-white' : ''}`}
            >
              Settings
            </button>
          </nav>
          <div className="flex items-center space-x-6">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-[10px] font-black text-pink-500 uppercase tracking-[0.2em] leading-none mb-1">
                Philippine Standard Time
              </p>
              <p className="text-lg font-mono font-bold text-white tabular-nums leading-none">
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
              <div className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold">
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
      </div>
    </main>
  )
}
