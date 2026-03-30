'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Bell, Volume2, Mail, Smartphone, Save, Loader2, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface SettingsProps {
  userId: string
}

export default function Settings({ userId }: SettingsProps) {
  const [notificationType, setNotificationType] = useState('both')
  const [ringtone, setRingtone] = useState('alert1.wav')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

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
      setRingtone(data.ringtone_choice || 'alert1.wav')
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
    { id: 'alert1.wav', name: 'Standard Alert' },
    { id: 'alert2.wav', name: 'Crystal Chime' },
    { id: 'classic.wav', name: 'Classic Bell' },
    { id: 'modern.wav', name: 'Modern Synth' },
  ]

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-pink-500" size={32} />
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-10 bg-white/[0.03] backdrop-blur-[40px] rounded-[2.5rem] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] text-white">
      <div className="mb-12 text-center md:text-left">
        <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">User Preferences</h2>
        <p className="text-zinc-500 mt-2 font-medium">Personalize your experience and alert delivery system.</p>
      </div>

      <div className="space-y-12">
        {/* Full Name & Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <User size={18} className="text-zinc-400" />
              <h3 className="text-lg font-bold text-zinc-300">Full Name</h3>
            </div>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white outline-none focus:ring-2 focus:ring-pink-500/50 transition-all shadow-inner"
              placeholder="Your full name"
            />
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-4">
              <Mail size={18} className="text-zinc-400" />
              <h3 className="text-lg font-bold text-zinc-300">Notification Email</h3>
            </div>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white outline-none focus:ring-2 focus:ring-pink-500/50 transition-all shadow-inner"
              placeholder="backup@email.com"
            />
          </section>
        </div>

        {/* Notification Channels */}
        <section>
          <div className="flex items-center space-x-2 mb-6">
            <Bell size={20} className="text-pink-500" />
            <h3 className="text-lg font-bold text-zinc-300">Alert Channels</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { id: 'push', icon: Smartphone, label: 'Push Only' },
              { id: 'email', icon: Mail, label: 'Email Only' },
              { id: 'both', icon: Bell, label: 'Both Channels' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setNotificationType(item.id)}
                className={`group flex flex-col items-center justify-center p-8 rounded-3xl border-2 transition-all duration-300 ${
                  notificationType === item.id 
                    ? 'bg-pink-500/10 border-pink-500 text-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.2)]' 
                    : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:border-white/20 hover:text-zinc-300'
                }`}
              >
                <item.icon size={28} className={`mb-3 transition-transform group-hover:scale-110`} />
                <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Ringtone Selection */}
        <section>
          <div className="flex items-center space-x-2 mb-6">
            <Volume2 size={20} className="text-violet-500" />
            <h3 className="text-lg font-bold text-zinc-300">Custom Ringtone</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ringtones.map((rt) => (
              <button
                key={rt.id}
                onClick={() => setRingtone(rt.id)}
                className={`flex items-center justify-between px-6 py-5 rounded-2xl border-2 transition-all duration-300 ${
                  ringtone === rt.id 
                    ? 'bg-violet-500/10 border-violet-500 text-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.2)]' 
                    : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:border-white/20 hover:text-zinc-300'
                }`}
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-bold">{rt.name}</span>
                  <span className="text-[10px] text-zinc-600 uppercase tracking-tighter mt-1 font-black">{rt.id}</span>
                </div>
                {ringtone === rt.id && <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,1)] animate-pulse" />}
              </button>
            ))}
          </div>
        </section>

        {/* Save/Status */}
        <div className="pt-10 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className={`text-sm font-medium ${message.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
            {message}
          </p>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full md:w-auto flex items-center justify-center px-12 py-4 bg-gradient-to-r from-pink-600 to-violet-600 rounded-2xl font-black text-white hover:scale-[1.03] active:scale-[0.97] transition-all shadow-[0_8px_32px_-8px_rgba(139,92,246,0.5)] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="animate-spin mr-2" size={18} />
            ) : (
              <Save size={18} className="mr-2" />
            )}
            Save All Preferences
          </button>
        </div>
      </div>
    </div>
  )
}
