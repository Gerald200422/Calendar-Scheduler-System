'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { X, Bell, Clock, AlignLeft, Type, Trash2, Calendar as CalendarIcon, ArrowRight, ToggleLeft, ToggleRight } from 'lucide-react'
import { format, parseISO, differenceInMinutes, isBefore } from 'date-fns'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: any) => void
  onDelete?: (eventId: string) => void
  selectedDate: Date
  initialEvent?: any
}

export default function EventModal({ isOpen, onClose, onSave, onDelete, selectedDate, initialEvent }: EventModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('10:00')
  const [notificationType, setNotificationType] = useState('both')
  const [notificationStyle, setNotificationStyle] = useState('default') // 'default' vs 'alarm'
  const [ringtoneOverride, setRingtoneOverride] = useState('')
  const [ringtoneDuration, setRingtoneDuration] = useState(30)
  const [isSameDay, setIsSameDay] = useState(true)
  const [location, setLocation] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [status, setStatus] = useState('upcoming')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const ringtones = [
    { id: 'samsung_ringtone.mp3', name: 'Samsung Alert' },
    { id: 'crystal_chime.mp3', name: 'Crystal Chime' },
    { id: 'classic_bell.mp3', name: 'Classic Bell' },
    { id: 'modern_synth.mp3', name: 'Modern Synth' },
  ]

  useEffect(() => {
    if (initialEvent && isOpen) {
      setTitle(initialEvent.title || '')
      setDescription(initialEvent.description || '')
      
      const start = parseISO(initialEvent.start_time)
      const end = parseISO(initialEvent.end_time)
      
      setStartDate(format(start, 'yyyy-MM-dd'))
      setStartTime(format(start, 'HH:mm'))
      setEndDate(format(end, 'yyyy-MM-dd'))
      setEndTime(format(end, 'HH:mm'))
      
      setIsSameDay(format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd'))
      setNotificationType(initialEvent.notification_type || 'both')
      setNotificationStyle(initialEvent.notification_style || 'default') 
      setRingtoneOverride(initialEvent.ringtone_override || '')
      setRingtoneDuration(initialEvent.ringtone_duration || 30)
      setLocation(initialEvent.location || '')
      setGuestEmail(initialEvent.guest_email || '')
      setStatus(initialEvent.status || 'upcoming')
      setErrors({})
    } else if (isOpen) {
      setTitle('')
      setDescription('')
      setLocation('')
      setGuestEmail('')
      setNotificationType('both')
      setNotificationStyle('default')
      setRingtoneOverride('')
      setRingtoneDuration(30)
      setStatus('upcoming')
      setErrors({})
      
      const startStr = format(selectedDate, 'yyyy-MM-dd')
      setStartDate(startStr)
      
      // Default to current time if today, otherwise default to 09:00 AM
      const now = new Date()
      const isToday = format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
      
      let startT = '09:00'
      let endT = '10:00'
      
      if (isToday) {
        // Round to next 5 minutes
        const roundedNow = new Date(now)
        roundedNow.setMinutes(Math.ceil(now.getMinutes() / 5) * 5)
        roundedNow.setSeconds(0)
        startT = format(roundedNow, 'HH:mm')
        
        const end = new Date(roundedNow.getTime() + 60 * 60 * 1000)
        endT = format(end, 'HH:mm')
      }
      
      setStartTime(startT)
      setEndDate(startStr)
      setEndTime(endT)
      
      setIsSameDay(true)
    }
  }, [initialEvent, isOpen, selectedDate])

  // Sync end date with start date if isSameDay is true
  useEffect(() => {
    if (isSameDay) {
      setEndDate(startDate)
    }
  }, [startDate, isSameDay])

  const durationText = useMemo(() => {
    try {
      const start = new Date(`${startDate}T${startTime}`)
      const end = new Date(`${endDate}T${endTime}`)
      const diff = differenceInMinutes(end, start)
      
      if (diff < 0) return 'Invalid range'
      
      const hours = Math.floor(diff / 60)
      const mins = diff % 60
      
      if (hours === 0 && mins === 0) return '0m'
      
      let text = ''
      if (hours > 0) text += `${hours}h `
      if (mins > 0) text += `${mins}m`
      return text.trim()
    } catch {
      return ''
    }
  }, [startDate, startTime, endDate, endTime])

  if (!isOpen) return null

  const handleSave = () => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = 'Event title is required'
    }

    if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      newErrors.guestEmail = 'Invalid email format'
    }

    const startObj = new Date(`${startDate}T${startTime}`)
    const endObj = new Date(`${endDate}T${endTime}`)

    if (isNaN(startObj.getTime())) {
      newErrors.startTime = 'Invalid start time'
    }

    if (isNaN(endObj.getTime())) {
      newErrors.endTime = 'Invalid end time'
    }

    if (!newErrors.startTime && !newErrors.endTime && isBefore(endObj, startObj)) {
      newErrors.endTime = 'End time must be after start time'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    onSave({ 
      id: initialEvent?.id,
      title, 
      description, 
      location,
      guestEmail,
      startTime: startObj.toISOString(),
      endTime: endObj.toISOString(),
      notificationType, 
      notification_style: notificationStyle,
      ringtone_override: ringtoneOverride,
      ringtone_duration: ringtoneDuration,
      status: status || 'upcoming',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
            {initialEvent ? 'Edit Event' : 'Create New Event'}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center space-x-3 text-zinc-400 focus-within:text-pink-600 transition-colors">
                <Type size={18} />
                <input 
                  type="text" 
                  placeholder="Event Title" 
                  className={cn(
                    "bg-transparent border-none outline-none text-zinc-900 dark:text-white w-full text-lg font-bold placeholder:text-zinc-300 dark:placeholder:text-zinc-600",
                    errors.title && "text-red-500 placeholder:text-red-300"
                  )}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    if (errors.title) setErrors(prev => ({ ...prev, title: '' }))
                  }}
                />
              </div>
              {errors.title && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-7">{errors.title}</p>}
            </div>

            {/* Location Field */}
            <div className="flex items-center space-x-3 text-zinc-400 focus-within:text-pink-600 transition-colors">
              <CalendarIcon size={18} className="opacity-50" />
              <input 
                type="text" 
                placeholder="Add Location" 
                className="bg-transparent border-none outline-none text-zinc-600 dark:text-zinc-400 w-full text-sm placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Guest Email Field */}
            <div className="space-y-1">
              <div className="flex items-center space-x-3 text-zinc-400 focus-within:text-pink-600 transition-colors">
                <Bell size={18} className="opacity-50" />
                <input 
                  type="email" 
                  placeholder="Guest Email (Optional)" 
                  className={cn(
                    "bg-transparent border-none outline-none text-zinc-600 dark:text-zinc-400 w-full text-sm placeholder:text-zinc-300 dark:placeholder:text-zinc-600",
                    errors.guestEmail && "text-red-500 placeholder:text-red-300"
                  )}
                  value={guestEmail}
                  onChange={(e) => {
                    setGuestEmail(e.target.value)
                    if (errors.guestEmail) setErrors(prev => ({ ...prev, guestEmail: '' }))
                  }}
                />
              </div>
              {errors.guestEmail && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-7">{errors.guestEmail}</p>}
            </div>

            {/* Start Section */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center">
                <Clock size={12} className="mr-2" /> Start Date & Time
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="date" 
                  className={cn(
                    "bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all text-sm shadow-sm",
                    errors.startTime && "border-red-500 ring-red-500/20"
                  )}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    if (errors.startTime) setErrors(prev => ({ ...prev, startTime: '' }))
                  }}
                />
                <input 
                  type="time" 
                  className={cn(
                    "bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all text-sm shadow-sm",
                    errors.startTime && "border-red-500 ring-red-500/20"
                  )}
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value)
                    if (errors.startTime) setErrors(prev => ({ ...prev, startTime: '' }))
                  }}
                />
              </div>
              {errors.startTime && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{errors.startTime}</p>}
            </div>
            </div>

            {/* End Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center">
                  <ArrowRight size={12} className="mr-2" /> End Date & Time
                </label>
                <button 
                  onClick={() => setIsSameDay(!isSameDay)}
                  className="flex items-center text-[10px] space-x-2 font-bold hover:text-white transition-colors text-zinc-500"
                >
                  <span>Same Day</span>
                  {isSameDay ? <ToggleRight className="text-pink-500" size={18} /> : <ToggleLeft size={18} />}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {!isSameDay && (
                  <input 
                    type="date" 
                    className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all text-sm shadow-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                )}
                <input 
                  type="time" 
                  className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all text-sm shadow-sm"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={{ gridColumn: isSameDay ? 'span 2' : 'span 1' }}
                />
              </div>
            </div>

            {/* Duration and Notification */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 px-4 py-3 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-between">
                <span className="text-xs font-bold text-pink-600 tracking-wide uppercase">Duration</span>
                <span className="text-sm font-bold text-pink-900">{durationText}</span>
              </div>
              <div className="flex-1">
                <select 
                  className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all w-full text-sm appearance-none shadow-sm cursor-pointer"
                  value={notificationType}
                  onChange={(e) => setNotificationType(e.target.value)}
                >
                  <option value="both">All Methods (Email + Push)</option>
                  <option value="push">Push Notification Only</option>
                  <option value="email">Email Alert Only</option>
                </select>
              </div>
            </div>

            {/* Notification Style & Ringtone Choice */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Alert Style</label>
                <select 
                  className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all w-full text-sm appearance-none shadow-sm cursor-pointer"
                  value={notificationStyle}
                  onChange={(e) => setNotificationStyle(e.target.value)}
                >
                  <option value="push">Standard (Simple Beep)</option>
                  <option value="alarm">Alarm (Loud Ringtone)</option>
                </select>
              </div>

              {notificationStyle === 'alarm' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Select Ringtone</label>
                    <select 
                      className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all w-full text-sm appearance-none shadow-sm cursor-pointer"
                      value={ringtoneOverride}
                      onChange={(e) => setRingtoneOverride(e.target.value)}
                    >
                      <option value="">Use Default Setting</option>
                      {ringtones.map(rt => (
                        <option key={rt.id} value={rt.id}>{rt.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Ringtone Duration (Seconds)</label>
                    <div className="flex items-center space-x-3">
                      <input 
                        type="range"
                        min="5"
                        max="300"
                        step="5"
                        className="flex-1 accent-pink-500"
                        value={ringtoneDuration}
                        onChange={(e) => setRingtoneDuration(parseInt(e.target.value))}
                      />
                      <span className="text-sm font-bold text-zinc-900 w-12 text-right">{ringtoneDuration}s</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status Section - Simplified to Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 mt-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Active Status</label>
              <button 
                onClick={() => setStatus(status === 'deleted' ? 'upcoming' : 'deleted')}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  status === 'deleted' 
                    ? 'bg-red-50 text-red-600 border-red-200 shadow-sm'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 shadow-sm'
                }`}
              >
                {status === 'deleted' ? 'Soft Deleted' : 'Normal'}
              </button>
            </div>

            <div className="flex items-start space-x-3 text-zinc-400 focus-within:text-pink-600 transition-colors pt-2">
              <AlignLeft size={18} className="mt-1" />
              <textarea 
                placeholder="Add Notes & Details" 
                rows={2}
                className="bg-transparent border-none outline-none text-zinc-600 w-full text-sm placeholder:text-zinc-300 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-between items-center">
          <div>
            {initialEvent && onDelete && (
              <button 
                onClick={() => {
                  onDelete(initialEvent.id)
                  onClose()
                }}
                className="flex items-center text-red-500 hover:text-red-700 text-sm font-bold transition-colors"
              >
                <Trash2 size={16} className="mr-1" /> Remove
              </button>
            )}
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-zinc-500 hover:text-zinc-900 font-bold transition-colors"
            >
              Discard
            </button>
            <button 
              onClick={handleSave}
              className="px-8 py-2.5 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-[0_10px_20px_-5px_rgba(0,0,0,0.2)] active:scale-95"
            >
              {initialEvent ? 'Update' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
