import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY_EVENTS } from '../constants/storageKeys';

export type TrackEventName =
  | 'login_success'
  | 'identity_switch'
  | 'driver_availability_change'
  | 'passenger_contact_driver'
  | 'profile_phone_updated';

export type TrackEventItem = {
  event: TrackEventName;
  timestamp: number;
  payload?: Record<string, any>;
};

const MAX_EVENTS = 200;

export async function track(event: TrackEventName, payload?: Record<string, any>) {
  const item: TrackEventItem = { event, timestamp: Date.now(), payload };
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_EVENTS);
    const list: TrackEventItem[] = raw
      ? (() => {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];
    list.push(item);
    const trimmed = list.length > MAX_EVENTS ? list.slice(list.length - MAX_EVENTS) : list;
    await AsyncStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(trimmed));
  } catch (_) {
    // ignore
  }
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[track]', item.event, item.payload ?? {});
  }
}

