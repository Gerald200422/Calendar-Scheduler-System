'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { cn } from '@/lib/utils'
import EventModal from './EventModal'
import { supabase } from '@/lib/supabase'

// Using shared cn from @/lib/utils

interface CalendarProps {
  userId: string
}

export default function Calendar({ userId }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const start = startOfWeek(startOfMonth(currentMonth)).toISOString()
    const end = endOfWeek(endOfMonth(currentMonth)).toISOString()

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', start)
      .lte('start_time', end)

    if (error) {
      console.error('Error fetching events:', error)
    } else {
      setEvents(data || [])
    }
    setLoading(false)
  }, [currentMonth, userId])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    // Subscribe to real-time changes on the events table
    const channel = supabase
      .channel('calendar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('Realtime update detected in Calendar, fetching events...')
          fetchEvents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchEvents])

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  })

  const handleOpenModal = (day: Date, event: any = null) => {
    setSelectedDate(day)
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  const handleSaveEvent = async (eventData: any) => {
    const payload = {
      user_id: userId,
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      guest_email: eventData.guestEmail,
      start_time: eventData.startTime,
      end_time: eventData.endTime,
      notification_style: eventData.notification_style,
      ringtone_override: eventData.ringtone_override,
      ringtone_duration: eventData.ringtone_duration,
      notification_type: eventData.notificationType,
    }

    let result;
    if (eventData.id) {
      // Update
      result = await supabase
        .from('events')
        .update(payload)
        .eq('id', eventData.id)
        .select()
    } else {
      // Insert
      result = await supabase
        .from('events')
        .insert([payload])
        .select()
    }

    const { data, error } = result

    if (error) {
      alert('Error saving event: ' + error.message)
    } else if (data && data[0]) {
      // Create/Update notification queue entry if needed
      const now = new Date()
      // Create a "clean" now with 0 seconds and 0 milliseconds
      const cleanNow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0)
      
      // ALARM style triggers EXACTLY at start time.
      // DEFAULT style triggers 15 minutes before.
      let triggerTime;
      if (eventData.notification_style === 'alarm') {
        triggerTime = new Date(eventData.startTime)
      } else {
        triggerTime = new Date(new Date(eventData.startTime).getTime() - 15 * 60 * 1000)
      }
      
      // If the trigger time is in the past, schedule for immediately (cleanNow)
      const scheduledFor = triggerTime < cleanNow ? cleanNow : triggerTime
      
      const { error: queueError } = await supabase.from('notification_queue').upsert([
        {
          event_id: data[0].id,
          user_id: userId,
          scheduled_for: scheduledFor.toISOString(),
          status: 'pending'
        }
      ], { onConflict: 'event_id' })
      
      if (queueError) {
        console.error('Error scheduling notification:', queueError.message)
        alert('Event saved, but failed to schedule notification: ' + queueError.message)
      }

      fetchEvents()
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (error) {
      alert('Error deleting event: ' + error.message)
    } else {
      fetchEvents()
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8 bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-zinc-200 shadow-[0_20px_50px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.05)] text-zinc-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 md:mb-10 gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent tracking-tight">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <p className="text-zinc-500 text-xs md:text-sm mt-2 font-medium">Smart scheduling for a modern lifestyle.</p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="flex rounded-xl md:rounded-2xl bg-zinc-100 p-1 border border-zinc-200">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 md:p-2.5 hover:bg-white rounded-lg md:rounded-xl transition-all shadow-sm text-zinc-600 hover:text-zinc-900"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 md:p-2.5 hover:bg-white rounded-lg md:rounded-xl transition-all shadow-sm text-zinc-600 hover:text-zinc-900"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button 
            onClick={() => handleOpenModal(new Date())}
            className="flex-1 md:flex-none flex items-center justify-center px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-pink-600 to-indigo-600 rounded-xl md:rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_8px_20px_-6px_rgba(219,39,119,0.4)]"
          >
            <Plus size={18} className="mr-2" /> New Event
          </button>
        </div>
      </div>

      {/* Weekdays Overlay */}
      <div className="grid grid-cols-7 mb-4 md:mb-6">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-[9px] md:text-[11px] font-black text-zinc-600 uppercase tracking-[0.1em] md:tracking-[0.2em]">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day[0]}</span>
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-3">
        {days.map((day, idx) => {
          const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0)
          const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59)
          
          const dayEvents = events.filter(e => {
            const start = parseISO(e.start_time)
            const end = parseISO(e.end_time)
            return start <= dayEnd && end >= dayStart
          })
          
          const isToday = isSameDay(day, new Date())
          const isSelected = isSameDay(day, selectedDate)
          const isCurrentMonth = isSameMonth(day, currentMonth)

          return (
            <div
              key={day.toString()}
              onClick={() => handleOpenModal(day)}
              className={cn(
                "min-h-[80px] md:min-h-[140px] p-2 md:p-4 cursor-pointer transition-all rounded-xl md:rounded-3xl relative group border",
                !isCurrentMonth ? "opacity-20 border-transparent pointer-events-none" : "hover:bg-zinc-50 bg-white",
                isSelected ? "border-pink-500/30 bg-pink-50/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]" : "border-zinc-100 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03)]",
                isToday && "ring-2 ring-pink-500/20 border-pink-500/50 shadow-[0_10px_20px_-5px_rgba(236,72,153,0.1)]"
              )}
            >
              <div className="flex justify-between items-start mb-1 md:mb-2">
                <span className={cn(
                  "text-sm md:text-lg font-bold tracking-tight",
                  isToday ? "text-pink-600" : "text-zinc-400 group-hover:text-zinc-900 transition-colors"
                )}>
                  {format(day, 'd')}
                </span>
                {isToday && (
                  <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                )}
              </div>
              
              {/* Event Indicators */}
              <div className="space-y-1 overflow-hidden">
                {dayEvents.slice(0, 3).map(e => {
                  const hasEnded = new Date(e.end_time) < new Date()
                  const isActive = new Date(e.start_time) <= new Date() && !hasEnded
                  const isDeleted = e.status === 'deleted'
                  
                  return (
                    <div 
                      key={e.id} 
                      onClick={(event) => {
                        event.stopPropagation()
                        handleOpenModal(day, e)
                      }}
                      className={cn(
                        "flex items-center text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-lg md:rounded-xl border transition-all truncate",
                        isDeleted ? "bg-red-500/5 text-red-500/40 border-red-500/10 grayscale opacity-30" :
                        isActive ? "bg-green-500/10 text-green-400 border-green-500/30 animate-pulse" :
                        hasEnded ? "bg-zinc-500/5 text-zinc-500 border-zinc-500/10" :
                        "bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20"
                      )}
                    >
                      {isActive && <div className="w-1 h-1 rounded-full bg-green-400 mr-1 shadow-[0_0_5px_rgba(74,222,128,0.8)]" />}
                      <span className={cn("truncate", (hasEnded || isDeleted) && "line-through")}>{e.title}</span>
                    </div>
                  )
                })}
                {dayEvents.length > 3 && (
                  <p className="text-[7px] md:text-[9px] text-zinc-600 font-black uppercase text-center mt-1">
                    +{dayEvents.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <EventModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        selectedDate={selectedDate}
        initialEvent={selectedEvent}
      />
    </div>
  )
}
