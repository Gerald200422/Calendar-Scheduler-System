import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Button, Alert, Platform } from 'react-native';
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

  useEffect(() => {
    // 1. Listen for Auth Changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 3. Listen for notification interactions (e.g. Stop button)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const actionIdentifier = response.actionIdentifier;
      if (actionIdentifier === 'stop-alarm') {
        const notificationId = response.notification.request.identifier;
        Notifications.dismissNotificationAsync(notificationId);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
    <View style={styles.container}>
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
      
      <View style={styles.buttonContainer}>
        <Button
          title="Test Local Notification"
          onPress={async () => {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Local Test Alert! 📅",
                body: 'This proves the app can receive alerts.',
                sound: 'default',
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: 1,
              },
            });
          }}
        />
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    // 1. Samsung Channel (v3 to force refresh)
    await Notifications.setNotificationChannelAsync('v3-samsung_alert', {
      name: 'Samsung Alert',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'samsung_alert',
    });

    // 2. Crystal Channel
    await Notifications.setNotificationChannelAsync('v3-crystal_chime', {
      name: 'Crystal Chime',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 100, 50, 100],
      lightColor: '#00FFFF',
      sound: 'crystal_chime',
    });

    // 3. Classic Channel
    await Notifications.setNotificationChannelAsync('v3-classic_bell', {
      name: 'Classic Bell',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 100, 500],
      lightColor: '#FFD700',
      sound: 'classic_bell',
    });

    // 4. Modern Channel
    await Notifications.setNotificationChannelAsync('v3-modern_synth', {
      name: 'Modern Synth',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 100, 100, 100, 100, 100, 500],
      lightColor: '#FF00FF',
      sound: 'modern_synth',
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 40,
    color: '#000',
    letterSpacing: -1,
  },
  authContainer: {
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 30,
    borderRadius: 30,
    width: '100%',
    borderWidth: 1,
    borderColor: '#eee',
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
    marginBottom: 20,
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
  buttonContainer: {
    marginTop: 40,
  }
});
