'use client'

import React, { useEffect, useState, useRef } from 'react'
import { BellRing, VolumeX } from 'lucide-react'

export default function RingtoneManager() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [alarmTitle, setAlarmTitle] = useState('')
  const [isBlocked, setIsBlocked] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'RING_ALARM') {
        const { ringtone, title, duration, isAlarm } = event.data
        // We only show the loud overlay and ringtone if it's an alarm
        // or has a custom ringtone override.
        startAlarm(ringtone, title, duration || 30)
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
  }, [])

  const startAlarm = (ringtoneFile: string, title: string, duration: number) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    setAlarmTitle(title)
    
    // Ensure filename has extension
    const fileName = ringtoneFile.endsWith('.mp3') ? ringtoneFile : `${ringtoneFile}.mp3`
    const audioPath = `/sounds/${fileName}`
    
    console.log(`[RingtoneManager] Attempting to play: ${audioPath}`)
    
    const audio = new Audio(audioPath)
    audio.loop = true
    audio.volume = 1.0 // Explicitly set maximum volume
    audioRef.current = audio
    
    audio.play().then(() => {
      console.log('[RingtoneManager] Playback started successfully.')
      setIsBlocked(false)
    }).catch(err => {
      console.warn('[RingtoneManager] Autoplay blocked or playback error:', err)
      setIsBlocked(true)
    })
    
    setIsPlaying(true)

    // Auto-stop after duration
    if (duration > 0) {
      setTimeout(() => {
        stopAlarm()
      }, duration * 1000)
    }
  }

  const stopAlarm = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlaying(false)
    setIsBlocked(false)
  }

  if (!isPlaying) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-w-sm w-full text-center space-y-6 transition-colors">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-pink-500 blur-2xl opacity-10 animate-pulse" />
          <div className="relative bg-gradient-to-br from-pink-500 to-violet-500 p-5 rounded-full inline-block animate-bounce shadow-lg">
            <BellRing size={40} className="text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase">
            {isBlocked ? 'Enable Sound' : 'Event Starting!'}
          </h2>
          <p className="text-pink-600 dark:text-pink-400 font-bold text-lg">{alarmTitle}</p>
        </div>

        <button
          onClick={isBlocked ? () => audioRef.current?.play().then(() => setIsBlocked(false)) : stopAlarm}
          className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all font-black rounded-2xl flex items-center justify-center space-x-2 text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          {isBlocked ? <BellRing size={24} /> : <VolumeX size={24} />}
          <span>{isBlocked ? 'PLAY ALARM' : 'STOP ALARM'}</span>
        </button>
      </div>
    </div>
  )
}
