import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import axios from 'axios';
import API from '../config/api';

export const usePushNotifications = (enabled = true, role = 'user') => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications are only available on native platforms.');
      return;
    }

    let isUnmounted = false;
    const removeListeners = [];

    const attachListener = async (eventName, handler) => {
      const listener = await PushNotifications.addListener(eventName, handler);
      removeListeners.push(listener);
    };

    const setup = async () => {
      try {
        try {
          await PushNotifications.createChannel({
            id: 'ride_requests',
            name: 'Ride requests',
            description: 'Incoming ride request alerts',
            importance: 5,
            visibility: 1,
            sound: 'default',
          });
        } catch (e) {
          // channel may already exist
        }

        const isCaptainRideRequestPush = (payload) => {
          const data = payload?.data || payload?.notification?.data || {};
          const title = payload?.title || payload?.notification?.title || '';
          const type = String(data.type || data.event || '').toLowerCase();
          const titleNorm = String(title || '').toLowerCase();
          return type === 'new-ride-request' || titleNorm.includes('new ride request');
        };

        const emitCaptainRideRequestEvent = (payload) => {
          try {
            const data = payload?.data || payload?.notification?.data || {};
            const rideId = data.rideId || data.rideID || data.ride_id || null;
            try {
              const persisted = {
                rideId,
                payload,
                ts: Date.now(),
              };
              window.sessionStorage.setItem('captain_pending_ride_request', JSON.stringify(persisted));
              window.localStorage.setItem('captainOnline', 'true');
            } catch (e) {
              // ignore storage failures
            }
            window.dispatchEvent(new CustomEvent('captain:new-ride-request', {
              detail: { rideId, payload },
            }));
            try {
              const path = window.location?.pathname || '';
              if (path !== '/captain-home') {
                window.location.href = '/captain-home';
              }
            } catch (e) {
              // ignore navigation errors
            }
          } catch (e) {
            // no-op
          }
        };

        await attachListener('registration', async (token) => {
          console.log('Push registration token:', token.value);
          try {
            const authToken = role === 'captain'
              ? (localStorage.getItem('captainToken') || localStorage.getItem('token'))
              : localStorage.getItem('token');
            const endpoint = role === 'captain' ? '/captain/push-token' : '/users/push-token';
            if (authToken && token && token.value) {
              const sessionToken = localStorage.getItem('device_session_token');
              const headers = { Authorization: `Bearer ${authToken}` };
              if (role === 'captain' && sessionToken) {
                headers['x-session-token'] = sessionToken;
              }
              await axios.post(
                `${API}${endpoint}`,
                { pushToken: token.value },
                { headers }
              );
            }
          } catch (error) {
            console.error('Failed to sync push token with backend:', error);
          }
        });

        await attachListener('registrationError', (error) => {
          console.error('Push registration error:', error);
        });

        await attachListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
          if (role === 'captain' && isCaptainRideRequestPush(notification)) {
            emitCaptainRideRequestEvent(notification);
          }
        });

        await attachListener('pushNotificationActionPerformed', (action) => {
          console.log('Push notification action:', action);
          if (role === 'captain') {
            emitCaptainRideRequestEvent(action && action.notification ? action.notification : action);
          }
        });

        const permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive !== 'granted') {
          console.log('Push notification permission denied.');
          return;
        }

        await PushNotifications.register();
      } catch (error) {
        if (!isUnmounted) {
          console.error('Push notification setup failed:', error);
        }
      }
    };

    setup();

    return () => {
      isUnmounted = true;
      for (const listener of removeListeners) {
        try {
          listener.remove();
        } catch (error) {
          console.error('Failed to remove push listener:', error);
        }
      }
    };
  }, [enabled, role]);
};
