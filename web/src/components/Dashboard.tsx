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
    const lastWeek = addDays(new Date(), -7).toISOString()

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
        .reverse()

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
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notification_queue', filter: `user_id=eq.${userId}` },
        () => fetchData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchData])

  const nextEvent = upcomingEvents[0]
  const todayEvents = [...upcomingEvents, ...historyEvents]
    .filter(e => isToday(parseISO(e.start_time)))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  const triggerSweep = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('process-notifications')
      if (error) throw error
      
      alert('Sweep Triggered Successfully')
      fetchData()
    } catch (err: any) {
      alert('Failed to trigger sweep: ' + (err.message || 'Check logs for details.'))
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
    <div className="w-full max-w-6xl mx-auto space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        <div className="lg:col-span-2 space-y-8 md:space-y-10">
          {/* Main Highlight: Next Up */}
          <div className="relative overflow-hidden p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-gradient-to-br from-pink-600/20 to-violet-600/20 border border-white/10 shadow-2xl backdrop-blur-xl group">
            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-700 hidden sm:block">
              <Bell size={140} />
            </div>
            
            <div className="relative z-10">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-pink-500/20 text-pink-300 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-6 md:mb-8 border border-pink-500/30">
                <AlertCircle size={14} className="mr-2" /> Next Up
              </span>
              
              {nextEvent ? (
                <>
                  <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
                    {nextEvent.title}
                  </h2>
                  <p className="text-zinc-400 text-sm md:text-lg mb-8 md:mb-10 max-w-lg line-clamp-2">
                    {nextEvent.description || 'No description provided.'}
                  </p>
                  
                  <div className="flex flex-wrap gap-4 md:gap-6 items-center">
                    <div className="flex items-center space-x-3 bg-white/5 backdrop-blur-md px-4 py-2 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl border border-white/5">
                      <CalendarIcon size={18} className="text-pink-400" />
                      <span className="text-xs md:text-sm font-bold">
                        {format(parseISO(nextEvent.start_time), 'MMM d')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 bg-white/5 backdrop-blur-md px-4 py-2 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl border border-white/5">
                      <Clock size={18} className="text-violet-400" />
                      <span className="text-xs md:text-sm font-bold">
                        {format(parseISO(nextEvent.start_time), 'h:mm a')}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 md:py-20 text-center text-zinc-500">
                  <p className="text-xl md:text-2xl font-bold">Your schedule is clear</p>
                  <p className="text-xs mt-3 opacity-60">Enjoy your free time!</p>
                </div>
              )}
            </div>
          </div>

          {/* Today's Agenda list */}
          <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white/[0.03] border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <h3 className="text-xl md:text-2xl font-bold flex items-center">
                <CalendarIcon size={20} className="mr-3 md:mr-4 text-pink-500" /> Today's Agenda
              </h3>
              <button 
                onClick={triggerSweep}
                className="flex items-center justify-center px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-300 transition-all hover:text-white group"
              >
                <Bell size={14} className="mr-2 group-hover:animate-bounce" /> Trigger Sweep
              </button>
            </div>
            
            <div className="space-y-4 md:space-y-5">
              {todayEvents.length > 0 ? todayEvents.map(event => {
                const hasEnded = new Date(event.end_time) < new Date()
                return (
                  <div key={event.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group gap-4 ${hasEnded ? 'opacity-50' : ''}`}>
                    <div className="flex items-center space-x-4 md:space-x-6">
                      <div className={`w-16 h-12 md:w-20 md:h-14 rounded-xl md:rounded-2xl flex flex-col items-center justify-center font-black border text-[10px] md:text-xs ${hasEnded ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                        <div>{format(parseISO(event.start_time), 'HH:mm')}</div>
                      </div>
                      <div>
                        <h4 className={`text-md md:text-lg font-bold text-white group-hover:text-pink-400 transition-colors tracking-tight line-clamp-1 ${hasEnded ? 'line-through text-zinc-500' : ''}`}>
                          {event.title}
                        </h4>
                        <p className="text-zinc-500 text-xs truncate max-w-[200px] md:max-w-[280px]">{event.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end space-x-4">
                      {hasEnded ? (
                        <span className="text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest bg-zinc-700/30 text-zinc-500 border border-white/5">
                          Ended
                        </span>
                      ) : (
                        <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest ${
                          event.notification_queue?.[0]?.status === 'sent' 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                            : 'bg-zinc-500/10 text-zinc-400 border border-white/5'
                        }`}>
                          {event.notification_queue?.[0]?.status || 'pending'}
                        </span>
                      )}
                      <ChevronRight size={18} className="text-zinc-700 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                )
              }) : (
                <div className="text-center py-10 md:py-12 text-zinc-500 bg-white/[0.01] rounded-[1.5rem] md:rounded-[2rem] border border-dashed border-white/5">
                  <p className="text-md font-medium">No more scheduled for today.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Upcoming List */}
        <div className="p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white/[0.02] border border-white/10">
          <h3 className="text-lg md:text-xl font-bold mb-8 md:mb-10 tracking-tight">Looking Ahead</h3>
          <div className="space-y-8 md:space-y-10">
            {upcomingEvents.slice(0, 6).map((event) => (
              <div key={event.id} className="relative pl-6 md:pl-8 border-l-2 border-white/5 hover:border-pink-500/50 transition-colors group">
                <div className="absolute top-0 -left-[5px] w-2 h-2 rounded-full bg-zinc-800 border border-white/10 group-hover:bg-pink-500 group-hover:shadow-[0_0_10px_rgba(236,72,153,0.8)] transition-all" />
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1.5 md:mb-2 group-hover:text-pink-500/60 transition-colors">
                  {format(parseISO(event.start_time), 'eeee')}
                </p>
                <h4 className="text-sm md:text-md font-bold text-white group-hover:translate-x-1 transition-transform truncate">{event.title}</h4>
                <p className="text-[10px] md:text-xs text-zinc-500 mt-1.5 md:mt-2 font-medium">
                  {format(parseISO(event.start_time), 'MMM d')} • {format(parseISO(event.start_time), 'h:mm a')}
                </p>
              </div>
            ))}
            
            {upcomingEvents.length === 0 && (
              <p className="text-zinc-600 text-sm text-center py-20 md:py-40 italic">Quiet week ahead...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
