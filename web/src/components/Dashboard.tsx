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
    <div className="w-full max-w-7xl mx-auto space-y-10 md:space-y-14 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          {/* Main Highlight: Next Up (Matching Image) */}
          <div className="relative overflow-hidden p-10 md:p-14 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.12)] dark:shadow-none group transition-all duration-500">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] dark:opacity-[0.05] group-hover:rotate-6 transition-transform duration-700 hidden sm:block">
              <Bell size={240} className="text-zinc-900 dark:text-white" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-8">
                <span className="flex items-center px-4 py-1.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-[10px] font-black uppercase tracking-widest border border-violet-100 dark:border-violet-800">
                  <Clock size={12} className="mr-2" /> Next Up
                </span>
              </div>
              
              {nextEvent ? (
                <>
                  <h2 className="text-4xl md:text-5xl font-extrabold text-zinc-900 dark:text-white mb-6 leading-tight max-w-2xl">
                    {nextEvent.title}
                  </h2>
                  <div className="mb-10">
                    <span className="px-5 py-2 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[10px] font-black uppercase tracking-widest border border-violet-200 dark:border-violet-700">
                      Upcoming
                    </span>
                  </div>
                  
                  <p className="text-zinc-500 dark:text-zinc-400 text-lg md:text-xl mb-12 max-w-xl leading-relaxed">
                    {nextEvent.description || 'This is to remind you that you have an upcoming event coming; prepare your things like foods, clothes, and other essentials for the retreat.'}
                  </p>
                  
                  <div className="flex flex-wrap gap-6 items-center">
                    <div className="flex items-center space-x-4 bg-zinc-50 dark:bg-zinc-800 px-6 py-4 rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-sm">
                      <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg shadow-inner border border-zinc-100 dark:border-zinc-800">
                        <CalendarIcon size={20} className="text-violet-600 dark:text-violet-400" />
                      </div>
                      <span className="text-md font-bold text-zinc-900 dark:text-zinc-100">
                        {format(parseISO(nextEvent.start_time), 'MMM d')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 bg-zinc-50 dark:bg-zinc-800 px-6 py-4 rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-sm">
                      <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg shadow-inner border border-zinc-100 dark:border-zinc-800">
                        <Clock size={20} className="text-violet-600 dark:text-violet-400" />
                      </div>
                      <span className="text-md font-bold text-zinc-900 dark:text-zinc-100">
                        {format(parseISO(nextEvent.start_time), 'h:mm a')}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-20 text-center text-zinc-400">
                  <p className="text-2xl font-bold">Your schedule is clear</p>
                  <p className="text-sm mt-3">Enjoy your free time!</p>
                </div>
              )}
            </div>
          </div>

          {/* Today's Agenda list (Matching Image) */}
          <div className="p-10 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.1)] dark:shadow-none transition-all duration-500">
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center">
                <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl mr-4 border border-violet-100 dark:border-violet-800">
                  <CalendarIcon size={24} className="text-violet-600 dark:text-violet-400" />
                </div>
                Today's Agenda
              </h3>
              <button 
                onClick={triggerSweep}
                className="flex items-center justify-center px-6 py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white rounded-xl text-[10px] font-black uppercase tracking-widest text-white dark:text-zinc-900 transition-all shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)] dark:shadow-none group active:scale-95"
              >
                <Bell size={14} className="mr-3" /> Trigger Sweep
              </button>
            </div>
            
            <div className="space-y-2">
              {todayEvents.length > 0 ? todayEvents.map(event => {
                const hasEnded = new Date(event.end_time) < new Date()
                return (
                  <div key={event.id} className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all group ${hasEnded ? 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-100 dark:border-zinc-800 opacity-50' : 'bg-white dark:bg-zinc-900 border-zinc-50 dark:border-zinc-800/50 hover:border-violet-100 dark:hover:border-violet-500/30 hover:bg-violet-50/30 dark:hover:bg-violet-900/10'}`}>
                    <div className="flex items-center space-x-6">
                      <div className={`w-20 h-14 rounded-2xl flex items-center justify-center font-black text-xs border ${hasEnded ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 border-zinc-300 dark:border-zinc-700' : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-100 dark:border-zinc-700 shadow-sm'}`}>
                        {format(parseISO(event.start_time), 'HH:mm')}
                      </div>
                      <div>
                        <h4 className={`text-lg font-bold text-zinc-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors ${hasEnded ? 'line-through text-zinc-400' : ''}`}>
                          {event.title}
                        </h4>
                        <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">{event.description || 'No more scheduled for today.'}</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-zinc-300 dark:text-zinc-600 group-hover:text-violet-500 transition-colors" />
                  </div>
                )
              }) : (
                <div className="text-center py-20 bg-zinc-50/50 dark:bg-zinc-800/20 rounded-[2rem] border-2 border-dashed border-zinc-100 dark:border-zinc-800 flex flex-col items-center">
                  <div className="w-16 h-16 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center shadow-sm mb-6 border border-zinc-100 dark:border-zinc-800">
                    <Clock size={24} className="text-zinc-300 dark:text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 font-bold text-lg">No more scheduled for today.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Looking Ahead (Matching Image) */}
        <div className="lg:col-span-4 space-y-10">
          <div className="p-10 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.1)] dark:shadow-none min-h-[600px] transition-all duration-500">
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-12">Looking Ahead</h3>
            <div className="space-y-12">
              {upcomingEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="relative pl-10 border-l-2 border-zinc-100 dark:border-zinc-800 group">
                  <div className="absolute top-0 -left-[5px] w-2.5 h-2.5 rounded-full bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 group-hover:bg-violet-600 group-hover:border-violet-600 group-hover:shadow-[0_0_15px_rgba(124,58,237,0.5)] transition-all" />
                  <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {format(parseISO(event.start_time), 'eeee')}
                  </p>
                  <h4 className="text-md font-bold text-zinc-900 dark:text-zinc-100 leading-tight group-hover:translate-x-1 transition-transform">
                    {event.title}
                  </h4>
                  <div className="mt-3">
                    <span className="inline-block px-3 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 text-[10px] font-bold border border-zinc-100 dark:border-zinc-700">
                      {format(parseISO(event.start_time), 'MMM d • h:mm a')}
                    </span>
                  </div>
                </div>
              ))}
              
              {upcomingEvents.length === 0 && (
                <p className="text-zinc-400 dark:text-zinc-600 text-sm italic text-center py-20">Quiet week ahead...</p>
              )}
            </div>

            <div className="mt-16 pt-12 border-t border-zinc-100 dark:border-zinc-800">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-10 opacity-100">Recent History</h3>
              <div className="space-y-8">
                {historyEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="group">
                    <p className="text-[10px] font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-widest mb-1">
                      {format(parseISO(event.end_time), 'MMM d')}
                    </p>
                    <h4 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 italic">No recent history.</h4>
                  </div>
                ))}
                
                {historyEvents.length === 0 && (
                  <p className="text-zinc-400 dark:text-zinc-600 text-sm italic">No recent history.</p>
                )}
              </div>
            </div>
          </div>

          {/* Pro Tip Card (Matching Image) */}
          <div className="rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.1)] dark:shadow-none overflow-hidden group transition-all duration-500">
            <div className="relative h-56 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&q=80&w=2000" 
                alt="Planner" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale dark:grayscale-0 dark:opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <div className="p-8">
              <span className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-3 block">Pro Tip</span>
              <p className="text-zinc-900 dark:text-zinc-100 font-bold text-lg leading-relaxed">
                Keep your schedule tight to maximize daily efficiency.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
