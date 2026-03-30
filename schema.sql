-- Tables for Scheduler App

-- 1. Profiles (User Preferences)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  full_name TEXT,
  email TEXT UNIQUE,
  notification_type TEXT DEFAULT 'push', -- 'push', 'email', or 'both'
  ringtone_choice TEXT DEFAULT 'alert1.wav'
);

-- 2. Events (Calendar Data)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  guest_email TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. FCM Tokens (Device Registration)
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform TEXT, -- 'ios', 'android'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Notification Queue
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events ON DELETE CASCADE UNIQUE,
  user_id UUID REFERENCES auth.users NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Users can manage their own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage their own events" ON public.events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own tokens" ON public.fcm_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own notifications" ON public.notification_queue FOR SELECT USING (auth.uid() = user_id);

-- 6. Cron Job Setup (Requires pg_cron extension)
-- To execute this, ensure you have the service_role key updated in the command below.
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- 7. Diagnostic Logs (For debugging)
CREATE TABLE IF NOT EXISTS public.processing_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT DEFAULT 'info',
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.processing_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only service role can manage logs" ON public.processing_logs FOR ALL USING (false) WITH CHECK (auth.role() = 'service_role');

-- 8. Enable Realtime (Must be run in the SQL Editor)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_queue;
