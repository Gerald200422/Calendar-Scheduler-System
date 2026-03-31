import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Button, Alert, Platform, ScrollView, TouchableOpacity } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // Included to satisfy newer SDK types
    shouldShowList: true, // Included to satisfy newer SDK types
  }),
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [session, setSession] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 1. Listen for Auth Changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 3. Listen for notification interactions (e.g. Stop button)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const actionIdentifier = response.actionIdentifier;
      if (actionIdentifier === 'stop-alarm') {
        const notificationId = response.notification.request.identifier;
        Notifications.dismissNotificationAsync(notificationId);
      }
    });

    // 4. Handle incoming notifications (e.g. for auto-stop duration)
    const notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      if (data && data.type === 'ALARM' && data.duration) {
        const durationMs = parseInt(data.duration as string) * 1000;
        setTimeout(() => {
          Notifications.dismissNotificationAsync(notification.request.identifier);
        }, durationMs);
      }
    });

    return () => {
      responseSubscription.remove();
      notificationSubscription.remove();
    };
  }, []);

  const fetchEvents = React.useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('events')
      .select('*, notification_queue(*)')
      .eq('user_id', session.user.id)
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error.message);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchEvents();
    
    const channel = supabase
      .channel('mobile-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchEvents())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEvents]);

  const saveTokenToSupabase = async (token: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase
      .from('fcm_tokens')
      .upsert({ 
        user_id: session.user.id,
        token: token,
        platform: Platform.OS
      }, { onConflict: 'token' });

    if (error) {
      console.error('Error saving push token:', error.message);
    } else {
      console.log('Push token saved successfully!');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.title}>Scheduler Mobile</Text>
      
      {!session ? (
        <View style={styles.authContainer}>
          <Text style={styles.prompt}>Please sign in via Web first to sync.</Text>
          <Text style={styles.status}>Status: Not Synced</Text>
        </View>
      ) : (
        <View style={styles.authContainer}>
          <Text style={styles.status}>Logged in as: {session.user.email}</Text>
          <Text style={styles.tokenLabel}>Push Token Registered:</Text>
          <Text style={styles.token}>{expoPushToken || 'Syncing...'}</Text>
        </View>
      )}

      {session && (
        <View style={styles.agendaContainer}>
          <View style={styles.agendaHeader}>
            <Text style={styles.agendaTitle}>Today's Agenda</Text>
            <TouchableOpacity onPress={fetchEvents} disabled={loading}>
              <Text style={styles.refreshText}>{loading ? '...' : 'Refresh'}</Text>
            </TouchableOpacity>
          </View>

          {events.length > 0 ? events.map((event) => {
            const hasEnded = new Date(event.end_time) < new Date();
            const isActive = new Date(event.start_time) <= new Date() && !hasEnded;
            const isDeleted = event.status === 'deleted';
            const startStr = new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            
            return (
              <View key={event.id} style={[
                styles.eventCard, 
                hasEnded && styles.eventCardEnded,
                isDeleted && styles.eventCardDeleted
              ]}>
                <View style={[
                  styles.timeContainer, 
                  hasEnded && styles.timeContainerEnded,
                  isActive && styles.timeContainerActive,
                  isDeleted && styles.timeContainerDeleted
                ]}>
                  <Text style={[
                    styles.timeText, 
                    hasEnded && styles.timeTextEnded,
                    isActive && styles.timeTextActive,
                    isDeleted && styles.timeTextDeleted
                  ]}>{startStr}</Text>
                </View>
                <View style={styles.eventInfo}>
                  <View style={styles.titleRow}>
                    <Text style={[
                      styles.eventTitle, 
                      (hasEnded || isDeleted) && styles.eventTitleEnded
                    ]}>{event.title}</Text>
                    <View style={[
                      styles.statusBadge,
                      isDeleted ? styles.statusBadgeDeleted :
                      hasEnded ? styles.statusBadgeEnded :
                      isActive ? styles.statusBadgeActive :
                      styles.statusBadgeUpcoming
                    ]}>
                      <Text style={[
                        styles.statusText,
                        isDeleted ? styles.statusTextDeleted :
                        hasEnded ? styles.statusTextEnded :
                        isActive ? styles.statusTextActive :
                        styles.statusTextUpcoming
                      ]}>
                        {isDeleted ? 'DELETED' : hasEnded ? 'ENDED' : isActive ? 'ACTIVE' : 'UPCOMING'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.eventDesc} numberOfLines={1}>{event.description || 'No description'}</Text>
                </View>
              </View>
            );
          }) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No events scheduled today.</Text>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        <Button
          title="Test Samsung Ringtone Alert"
          onPress={async () => {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Samsung Ringtone Test! 📱",
                body: 'Checking if the custom sound is working...',
                sound: 'samsung_ringtone',
                // @ts-ignore: channelId exists in NotificationContentInput for Android
                channelId: 'v4-samsung_ringtone',
              } as any,
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: 1,
              },
            });
          }}
        />
      </View>
      <StatusBar style="auto" />
    </ScrollView>
  );
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    // 1. Samsung Channel (v4 to force refresh)
    await Notifications.setNotificationChannelAsync('v4-samsung_ringtone', {
      name: 'Samsung Alert',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'samsung_ringtone',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });

    // 2. Crystal Channel
    await Notifications.setNotificationChannelAsync('v3-crystal_chime', {
      name: 'Crystal Chime',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 100, 50, 100],
      lightColor: '#00FFFF',
      sound: 'crystal_chime',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });

    // 3. Classic Channel
    await Notifications.setNotificationChannelAsync('v3-classic_bell', {
      name: 'Classic Bell',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 100, 500],
      lightColor: '#FFD700',
      sound: 'classic_bell',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });

    // 4. Modern Channel
    await Notifications.setNotificationChannelAsync('v3-modern_synth', {
      name: 'Modern Synth',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 100, 100, 100, 100, 100, 500],
      lightColor: '#FF00FF',
      sound: 'modern_synth',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }

  // Define Notification Category with 'Stop Alarm' button
  await Notifications.setNotificationCategoryAsync('ALARM', [
    {
      identifier: 'stop-alarm',
      buttonTitle: 'Stop Alarm 🛑',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log(token);
  } else {
    Alert.alert('Must use physical device for Push Notifications');
  }

  return token;
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 40,
    color: '#000',
    letterSpacing: -1,
    textAlign: 'center',
  },
  authContainer: {
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 25,
    borderRadius: 25,
    width: '100%',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 30,
  },
  prompt: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 15,
  },
  tokenLabel: {
    fontSize: 10,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  token: {
    fontSize: 10,
    color: '#bbb',
    textAlign: 'center',
  },
  agendaContainer: {
    width: '100%',
    marginTop: 10,
  },
  agendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  agendaTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
  },
  refreshText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '700',
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  eventCardEnded: {
    opacity: 0.6,
    backgroundColor: '#f1f5f9',
  },
  eventCardDeleted: {
    opacity: 0.3,
    backgroundColor: '#fee2e220',
    borderColor: '#ef444420',
  },
  timeContainer: {
    width: 60,
    height: 40,
    backgroundColor: '#6366f110',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6366f120',
  },
  timeContainerEnded: {
    backgroundColor: '#94a3b820',
    borderColor: '#94a3b830',
  },
  timeContainerActive: {
    backgroundColor: '#22c55e20',
    borderColor: '#22c55e40',
  },
  timeContainerDeleted: {
    backgroundColor: '#ef444410',
    borderColor: '#ef444420',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6366f1',
  },
  timeTextEnded: {
    color: '#94a3b8',
  },
  timeTextActive: {
    color: '#22c55e',
  },
  timeTextDeleted: {
    color: '#ef4444',
  },
  eventInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  eventTitleEnded: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  eventDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeUpcoming: {
    backgroundColor: '#6366f110',
    borderColor: '#6366f130',
  },
  statusBadgeActive: {
    backgroundColor: '#22c55e20',
    borderColor: '#22c55e40',
  },
  statusBadgeEnded: {
    backgroundColor: '#94a3b810',
    borderColor: '#94a3b820',
  },
  statusBadgeDeleted: {
    backgroundColor: '#ef444415',
    borderColor: '#ef444430',
  },
  statusText: {
    fontSize: 8,
    fontWeight: '900',
  },
  statusTextUpcoming: {
    color: '#6366f1',
  },
  statusTextActive: {
    color: '#16a34a',
  },
  statusTextEnded: {
    color: '#64748b',
  },
  statusTextDeleted: {
    color: '#ef4444',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 40,
  }
});
