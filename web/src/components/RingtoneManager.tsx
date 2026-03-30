'use client'

import React, { useEffect, useState, useRef } from 'react'
import { BellRing, VolumeX } from 'lucide-react'

export default function RingtoneManager() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [alarmTitle, setAlarmTitle] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'RING_ALARM') {
        const { ringtone, title } = event.data
        startAlarm(ringtone, title)
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
  }, [])

  const startAlarm = (ringtoneFile: string, title: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
    }

    setAlarmTitle(title)
    const audio = new Audio(`/sounds/${ringtoneFile}`)
    audio.loop = true
    audioRef.current = audio
    
    audio.play().catch(err => {
      console.warn('Autoplay blocked. User interaction required to play alarm sound.', err)
      // On some browsers, we might need a fallback UI to "Accept" the alarm
    })
    
    setIsPlaying(true)
  }

  const stopAlarm = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlaying(false)
  }

  if (!isPlaying) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#1a1a1a] border border-pink-500/30 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(236,72,153,0.3)] max-w-sm w-full text-center space-y-6">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-pink-500 blur-2xl opacity-20 animate-pulse" />
          <div className="relative bg-gradient-to-br from-pink-500 to-violet-500 p-5 rounded-full inline-block animate-bounce">
            <BellRing size={40} className="text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white tracking-tight uppercase">Event Starting!</h2>
          <p className="text-pink-400 font-bold text-lg">{alarmTitle}</p>
        </div>

        <button
          onClick={stopAlarm}
          className="w-full py-4 bg-white text-black hover:bg-zinc-200 transition-all font-black rounded-2xl flex items-center justify-center space-x-2 text-lg shadow-xl"
        >
          <VolumeX size={24} />
          <span>STOP ALARM</span>
        </button>
      </div>
    </div>
  )
}
