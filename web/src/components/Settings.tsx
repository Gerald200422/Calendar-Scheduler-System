'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Bell, Volume2, Mail, Smartphone, Save, Loader2, User, Moon, Sun } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface SettingsProps {
  userId: string
}

export default function Settings({ userId }: SettingsProps) {
  const [notificationType, setNotificationType] = useState('both')
  const [ringtone, setRingtone] = useState('samsung_ringtone.mp3')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.classList.toggle('dark', savedTheme === 'dark')
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const playPreview = async (rt: any) => {
    setLoadingId(rt.id)
    setMessage('')

    // 1. Immediate Vibration (Tactile feedback)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      let pattern = [200, 100, 200]
      if (rt.id === 'crystal_chime.mp3') pattern = [100, 50, 100, 50, 100, 50, 100]
      else if (rt.id === 'classic_bell.mp3') pattern = [500, 110, 500, 110, 500]
      else if (rt.id === 'modern_synth.mp3') pattern = [100, 100, 100, 100, 100, 100, 500]
      
      navigator.vibrate(pattern)
    }

    // 2. Audio Preview with Promise Handling
    try {
      const audio = new Audio(rt.url)
      audio.crossOrigin = "anonymous" // Prevent CORS issues
      
      const playPromise = audio.play()
      
      if (playPromise !== undefined) {
        setPlayingId(rt.id)
        setLoadingId(null)
        
        await playPromise
        audio.onended = () => setPlayingId(null)
      }
    } catch (err: any) {
      console.error('Playback blocked or failed:', err)
      setPlayingId(null)
      setLoadingId(null)
      
      if (err.name === 'NotAllowedError') {
        setMessage('Audio blocked. Tap again or check Silent Switch.')
      } else {
        setMessage('Could not load audio sample.')
      }
    }
  }

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error)
    } else if (data) {
      setNotificationType(data.notification_type || 'both')
      setRingtone(data.ringtone_choice || 'samsung_ringtone.mp3')
      setEmail(data.email || '')
      setFullName(data.full_name || '')
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: fullName,
        email: email,
        notification_type: notificationType,
        ringtone_choice: ringtone,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      setMessage('Error saving: ' + error.message)
    } else {
      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    }
    setSaving(false)
  }

  const ringtones = [
    { id: 'samsung_ringtone.mp3', name: 'Samsung Alert', url: '/sounds/samsung_ringtone.mp3' },
    { id: 'crystal_chime.mp3', name: 'Crystal Chime', url: '/sounds/crystal_chime.mp3' },
    { id: 'classic_bell.mp3', name: 'Classic Bell', url: '/sounds/classic_bell.mp3' },
    { id: 'modern_synth.mp3', name: 'Modern Synth', url: '/sounds/modern_synth.mp3' },
  ]

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-pink-500" size={32} />
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-10 bg-white dark:bg-zinc-900 rounded-[1.5rem] md:rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.05)] text-zinc-900 dark:text-zinc-100 transition-colors">
      <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500 bg-clip-text text-transparent">User Preferences</h2>
          <p className="text-zinc-500 mt-2 font-medium text-sm md:text-base">Personalize your experience and alert delivery system.</p>
        </div>
        
        {/* Theme Toggle Switch */}
        <div className="flex items-center justify-center space-x-4 bg-zinc-100 dark:bg-zinc-800 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-700">
          <button 
            onClick={() => theme !== 'light' && toggleTheme()}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-xl transition-all",
              theme === 'light' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Sun size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Light</span>
          </button>
          <button 
            onClick={() => theme !== 'dark' && toggleTheme()}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-xl transition-all",
              theme === 'dark' ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <Moon size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Dark</span>
          </button>
        </div>
      </div>

      <div className="space-y-8 md:space-y-12">
        {/* Full Name & Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <section>
            <div className="flex items-center space-x-2 mb-3 md:mb-4">
              <User size={16} className="text-zinc-400" />
              <h3 className="text-md md:text-lg font-bold text-zinc-300">Full Name</h3>
            </div>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl md:rounded-2xl px-4 py-3 md:px-5 md:py-3.5 text-zinc-900 dark:text-white text-sm md:text-base outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all shadow-sm"
              placeholder="Your full name"
            />
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-3 md:mb-4">
              <Mail size={16} className="text-zinc-400" />
              <h3 className="text-md md:text-lg font-bold text-zinc-300">Notification Email</h3>
            </div>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl md:rounded-2xl px-4 py-3 md:px-5 md:py-3.5 text-zinc-900 dark:text-white text-sm md:text-base outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all shadow-sm"
              placeholder="backup@email.com"
            />
          </section>
        </div>

        {/* Notification Channels */}
        <section>
          <div className="flex items-center space-x-2 mb-5 md:mb-6">
            <Bell size={18} className="text-pink-500" />
            <h3 className="text-md md:text-lg font-bold text-zinc-300">Alert Channels</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
            {[
              { id: 'push', icon: Smartphone, label: 'Push Only' },
              { id: 'email', icon: Mail, label: 'Email Only' },
              { id: 'both', icon: Bell, label: 'Both Channels' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setNotificationType(item.id)}
                className={`group flex flex-row sm:flex-col items-center justify-center p-4 sm:p-8 rounded-2xl sm:rounded-3xl border-2 transition-all duration-300 gap-4 sm:gap-2 ${
                  notificationType === item.id 
                    ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-500 text-pink-600 dark:text-pink-400 shadow-[0_10px_20px_-5px_rgba(236,72,153,0.15)]' 
                    : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-500 hover:bg-zinc-100/50 dark:hover:bg-zinc-800'
                }`}
              >
                <item.icon size={24} className={`sm:mb-1 transition-transform group-hover:scale-110`} />
                <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Ringtone Selection */}
        <section>
          <div className="flex items-center space-x-2 mb-5 md:mb-6">
            <Volume2 size={18} className="text-violet-500" />
            <h3 className="text-md md:text-lg font-bold text-zinc-300">Custom Ringtone</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {ringtones.map((rt) => (
              <div key={rt.id} className="relative group/rt">
                <button
                  onClick={() => setRingtone(rt.id)}
                  className={`w-full flex items-center justify-between px-5 md:px-6 py-4 md:py-5 rounded-xl md:rounded-2xl border-2 transition-all duration-300 ${
                    ringtone === rt.id 
                      ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-500 text-violet-600 dark:text-violet-400 shadow-[0_10px_20px_-5px_rgba(139,92,246,0.15)]' 
                      : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-500 hover:bg-zinc-100/50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="text-xs md:text-sm font-bold">{rt.name}</span>
                    <span className="text-[8px] md:text-[10px] text-zinc-600 uppercase tracking-tighter mt-0.5 font-black">{rt.id}</span>
                  </div>
                  {ringtone === rt.id && <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,1)] animate-pulse" />}
                </button>
                
                {/* Preview Button Overlay */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    playPreview(rt)
                  }}
                  disabled={loadingId === rt.id}
                  className={`absolute right-12 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all ${playingId === rt.id ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800' : ''}`}
                >
                  {loadingId === rt.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Volume2 size={16} className={playingId === rt.id ? 'animate-pulse' : ''} />
                  )}
                </button>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[10px] text-zinc-600 font-medium italic">
            Tip: If on iPhone, ensure your physical <span className="text-zinc-500 font-bold">Silent Switch</span> is turned OFF to hear previews.
          </p>
        </section>

        {/* Save/Status */}
        <div className="pt-8 md:pt-10 border-t border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className={`text-xs md:text-sm font-medium ${message.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
            {message}
          </p>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full md:w-auto flex items-center justify-center px-8 md:px-12 py-3.5 md:py-4 bg-gradient-to-r from-pink-600 to-violet-600 rounded-xl md:rounded-2xl font-black text-white text-xs md:text-sm hover:scale-[1.03] active:scale-[0.97] transition-all shadow-[0_8px_32px_-8px_rgba(139,92,246,0.5)] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="animate-spin mr-2" size={16} />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  )
}
