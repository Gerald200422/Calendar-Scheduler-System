'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, isToday, parseISO, addDays } from 'date-fns'
import { Bell, Calendar as CalendarIcon, Clock, ChevronRight, AlertCircle } from 'lucide-react'

interface DashboardProps {
  userId: string
}

export default function Dashboard({ userId }: DashboardProps) {
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [historyEvents, setHistoryEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    const now = new Date().toISOString()
    const nextWeek = addDays(new Date(), 7).toISOString()
    const lastWeek = addDays(new Date(), -7).toISOString()

    // 1. Fetch Upcoming (& Today's)
    const { data: upcoming, error: upcomingError } = await supabase
      .from('events')
      .select('*, notification_queue(*)')
      .eq('id', userId || '') // Fallback for safety
      .order('start_time', { ascending: true }) // We'll filter in JS to handle Realtime better

    // Using a simpler fetch and filtering in JS to ensure Realtime doesn't misplace items
    const { data: allEvents, error } = await supabase
      .from('events')
      .select('*, notification_queue(*)')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching dashboard events:', error)
    } else {
      const sorted = allEvents?.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()) || []
      
      const upcoming = sorted.filter(e => new Date(e.end_time).toISOString() >= now)
      const history = sorted
        .filter(e => new Date(e.end_time).toISOString() < now && new Date(e.end_time).toISOString() >= lastWeek)
        .reverse() // Newest history first

      setUpcomingEvents(upcoming)
      setHistoryEvents(history)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `user_id=eq.${userId}` },
        () => {
          console.log('Realtime update in Dashboard')
          fetchData()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notification_queue', filter: `user_id=eq.${userId}` },
        () => {
          console.log('Realtime notification update in Dashboard')
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchData])

  const nextEvent = upcomingEvents[0]
  const todayActive = upcomingEvents.filter(e => isToday(parseISO(e.start_time)))

  const triggerSweep = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      const result = await response.json()
      alert('Sweep Triggered: ' + (result.message || result.error || 'Check logs for details.'))
      fetchData()
    } catch (err: any) {
      alert('Failed to trigger sweep: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* Main Highlight: Next Up */}
          <div className="relative overflow-hidden p-10 rounded-[3rem] bg-gradient-to-br from-pink-600/20 to-violet-600/20 border border-white/10 shadow-2xl backdrop-blur-xl group">
            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-700">
              <Bell size={140} />
            </div>
            
            <div className="relative z-10">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-black uppercase tracking-widest mb-8 border border-pink-500/30">
                <AlertCircle size={14} className="mr-2" /> Next Up
              </span>
              
              {nextEvent ? (
                <>
                  <h2 className="text-5xl font-extrabold text-white mb-4 leading-tight">
                    {nextEvent.title}
                  </h2>
                  <p className="text-zinc-400 text-lg mb-10 max-w-lg line-clamp-1">
                    {nextEvent.description || 'No description provided.'}
                  </p>
                  
                  <div className="flex flex-wrap gap-6 items-center">
                    <div className="flex items-center space-x-3 bg-white/5 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/5">
                      <CalendarIcon size={20} className="text-pink-400" />
                      <span className="text-sm font-bold">
                        {format(parseISO(nextEvent.start_time), 'MMM d')} - {format(parseISO(nextEvent.end_time), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 bg-white/5 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/5">
                      <Clock size={20} className="text-violet-400" />
                      <span className="text-sm font-bold">
                        {format(parseISO(nextEvent.start_time), 'h:mm a')} - {format(parseISO(nextEvent.end_time), 'h:mm a')}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-20 text-center text-zinc-500">
                  <p className="text-2xl font-bold">Your schedule is clear</p>
                  <p className="text-sm mt-3 opacity-60">Enjoy your free time!</p>
                </div>
              )}
            </div>
          </div>

          {/* Today's Agenda list */}
          <div className="p-10 rounded-[3rem] bg-white/[0.03] border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <h3 className="text-2xl font-bold flex items-center">
                <CalendarIcon size={24} className="mr-4 text-pink-500" /> Today's Active Agenda
              </h3>
              <button 
                onClick={triggerSweep}
                className="flex items-center justify-center px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-zinc-300 transition-all hover:text-white group"
              >
                <Bell size={14} className="mr-2 group-hover:animate-bounce" /> Trigger Manual Sweep
              </button>
            </div>
            
            <div className="space-y-5">
              {todayActive.length > 0 ? todayActive.map(event => (
                <div key={event.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group">
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-14 rounded-2xl bg-indigo-500/10 flex flex-col items-center justify-center text-indigo-400 font-black border border-indigo-500/20 text-xs">
                      <div>{format(parseISO(event.start_time), 'HH:mm')}</div>
                      <div className="opacity-40 text-[9px] uppercase">to</div>
                      <div>{format(parseISO(event.end_time), 'HH:mm')}</div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white group-hover:text-pink-400 transition-colors tracking-tight">{event.title}</h4>
                      <p className="text-zinc-500 text-sm truncate max-w-[280px]">{event.description || 'No records'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${
                      event.notification_queue?.[0]?.status === 'sent' 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                        : 'bg-zinc-500/10 text-zinc-400 border border-white/5'
                    }`}>
                      {event.notification_queue?.[0]?.status || 'pending'}
                    </span>
                    <ChevronRight size={22} className="text-zinc-700 group-hover:text-white transition-colors" />
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-zinc-500 bg-white/[0.01] rounded-[2rem] border border-dashed border-white/5">
                  <p className="text-lg font-medium">No more active events for today.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recently Completed History */}
          {historyEvents.length > 0 && (
            <div className="p-10 rounded-[3rem] bg-black/20 border border-white/5">
              <h3 className="text-xl font-bold mb-8 text-zinc-400 flex items-center">
                <ChevronRight size={20} className="mr-2 text-zinc-600" /> Recent History (Last 7 Days)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {historyEvents.map(event => (
                  <div key={event.id} className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-300 line-clamp-1">{event.title}</h4>
                      <p className="text-[10px] text-zinc-600 font-bold mt-1 uppercase tracking-tighter">
                        Concluded {format(parseISO(event.end_time), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500/50">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Upcoming List */}
        <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/10 h-full">
          <h3 className="text-xl font-bold mb-10 tracking-tight">Looking Ahead</h3>
          <div className="space-y-10">
            {upcomingEvents.slice(0, 6).map((event) => (
              <div key={event.id} className="relative pl-8 border-l-2 border-white/5 hover:border-pink-500/50 transition-colors group">
                <div className="absolute top-0 -left-[5px] w-2 h-2 rounded-full bg-zinc-800 border border-white/10 group-hover:bg-pink-500 group-hover:shadow-[0_0_10px_rgba(236,72,153,0.8)] transition-all" />
                <p className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2 group-hover:text-pink-500/60 transition-colors">
                  {format(parseISO(event.start_time), 'eeee')}
                </p>
                <h4 className="text-md font-bold text-white group-hover:translate-x-1 transition-transform">{event.title}</h4>
                <p className="text-xs text-zinc-500 mt-2 font-medium">
                  {format(parseISO(event.start_time), 'MMM d')} • {format(parseISO(event.start_time), 'h:mm a')}
                </p>
              </div>
            ))}
            
            {upcomingEvents.length === 0 && (
              <p className="text-zinc-600 text-sm text-center py-40 italic">Quiet week ahead...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
