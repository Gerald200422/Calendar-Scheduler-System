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
  const [notificationType, setNotificationType] = useState('push')
  const [notificationStyle, setNotificationStyle] = useState('default') // 'default' vs 'alarm'
  const [ringtoneOverride, setRingtoneOverride] = useState('')
  const [isSameDay, setIsSameDay] = useState(true)
  const [location, setLocation] = useState('')
  const [guestEmail, setGuestEmail] = useState('')

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
      setNotificationType(initialEvent.notification_type || 'push')
      setNotificationStyle(initialEvent.notification_style || 'push') // 'push' means default beep, 'alarm' means loud
      setRingtoneOverride(initialEvent.ringtone_override || '')
      setLocation(initialEvent.location || '')
      setGuestEmail(initialEvent.guest_email || '')
    } else if (isOpen) {
      setTitle('')
      setDescription('')
      setLocation('')
      setGuestEmail('')
      setRingtoneOverride('')
      setNotificationStyle('push')
      
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
      setNotificationType('push')
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
    const startObj = new Date(`${startDate}T${startTime}`)
    const endObj = new Date(`${endDate}T${endTime}`)

    if (isBefore(endObj, startObj)) {
      alert('End time cannot be before start time.')
      return
    }

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
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-pink-500/10 to-violet-500/10">
          <h3 className="text-xl font-semibold text-white">
            {initialEvent ? 'Edit Event' : 'Create New Event'}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="space-y-6">
            <div className="flex items-center space-x-3 text-zinc-400 focus-within:text-pink-500 transition-colors">
              <Type size={18} />
              <input 
                type="text" 
                placeholder="Event Title" 
                className="bg-transparent border-none outline-none text-white w-full text-lg font-medium placeholder:text-zinc-600"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Location Field */}
            <div className="flex items-center space-x-3 text-zinc-400 focus-within:text-pink-500 transition-colors">
              <CalendarIcon size={18} className="opacity-50" />
              <input 
                type="text" 
                placeholder="Add Location" 
                className="bg-transparent border-none outline-none text-white w-full text-sm placeholder:text-zinc-600"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Guest Email Field */}
            <div className="flex items-center space-x-3 text-zinc-400 focus-within:text-pink-500 transition-colors">
              <Bell size={18} className="opacity-50" />
              <input 
                type="email" 
                placeholder="Guest Email (Optional)" 
                className="bg-transparent border-none outline-none text-white w-full text-sm placeholder:text-zinc-600"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
              />
            </div>

            {/* Start Section */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center">
                <Clock size={12} className="mr-2" /> Start Date & Time
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="date" 
                  className="bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-1 focus:ring-pink-500 transition-all text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <input 
                  type="time" 
                  className="bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-1 focus:ring-pink-500 transition-all text-sm"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
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
                    className="bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-1 focus:ring-pink-500 transition-all text-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                )}
                <input 
                  type="time" 
                  className="bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-1 focus:ring-pink-500 transition-all text-sm"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={{ gridColumn: isSameDay ? 'span 2' : 'span 1' }}
                />
              </div>
            </div>

            {/* Duration and Notification */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 px-4 py-3 rounded-xl bg-pink-500/5 border border-pink-500/10 flex items-center justify-between">
                <span className="text-xs font-bold text-pink-300 tracking-wide uppercase">Duration</span>
                <span className="text-sm font-medium text-white">{durationText}</span>
              </div>
              <div className="flex-1">
                <select 
                  className="bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-pink-500 transition-all w-full text-sm appearance-none"
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
                  className="bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-pink-500 transition-all w-full text-sm appearance-none"
                  value={notificationStyle}
                  onChange={(e) => setNotificationStyle(e.target.value)}
                >
                  <option value="push">Standard (Simple Beep)</option>
                  <option value="alarm">Alarm (Loud Ringtone)</option>
                </select>
              </div>

              {notificationStyle === 'alarm' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Select Ringtone</label>
                  <select 
                    className="bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-pink-500 transition-all w-full text-sm appearance-none"
                    value={ringtoneOverride}
                    onChange={(e) => setRingtoneOverride(e.target.value)}
                  >
                    <option value="">Use Default Setting</option>
                    {ringtones.map(rt => (
                      <option key={rt.id} value={rt.id}>{rt.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-start space-x-3 text-zinc-400 focus-within:text-pink-500 transition-colors pt-2">
              <AlignLeft size={18} className="mt-1" />
              <textarea 
                placeholder="Add Notes & Details" 
                rows={2}
                className="bg-transparent border-none outline-none text-white w-full text-sm placeholder:text-zinc-600 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/5 flex justify-between items-center">
          <div>
            {initialEvent && onDelete && (
              <button 
                onClick={() => {
                  onDelete(initialEvent.id)
                  onClose()
                }}
                className="flex items-center text-red-500 hover:text-red-400 text-sm font-medium transition-colors"
              >
                <Trash2 size={16} className="mr-1" /> Remove
              </button>
            )}
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white font-medium transition-colors"
            >
              Discard
            </button>
            <button 
              onClick={handleSave}
              className="px-8 py-2.5 bg-gradient-to-r from-pink-500 to-violet-500 rounded-xl font-bold text-white hover:opacity-90 transition-all shadow-lg hover:shadow-pink-500/25 active:scale-95"
            >
              {initialEvent ? 'Update' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
