import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const defaultPositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

function hasBrowserGeolocation() {
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
}

function isNativePlatform() {
  try {
    return Capacitor.isNativePlatform();
  } catch (e) {
    return false;
  }
}

export function hasDeviceGeolocation() {
  return isNativePlatform() || hasBrowserGeolocation();
}

export async function ensureLocationPermission() {
  if (!isNativePlatform()) return { granted: true };

  const current = await Geolocation.checkPermissions();
  if (current.location === 'granted' || current.coarseLocation === 'granted') {
    return { granted: true };
  }

  const requested = await Geolocation.requestPermissions();
  const granted = requested.location === 'granted' || requested.coarseLocation === 'granted';
  return { granted };
}

export async function getCurrentDevicePosition(options = {}) {
  const mergedOptions = { ...defaultPositionOptions, ...options };

  if (isNativePlatform()) {
    const permission = await ensureLocationPermission();
    if (!permission.granted) {
      const error = new Error('Location permission denied');
      error.code = 1;
      throw error;
    }
    return Geolocation.getCurrentPosition(mergedOptions);
  }

  if (!hasBrowserGeolocation()) {
    throw new Error('Geolocation is not supported');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, mergedOptions);
  });
}

export async function watchDevicePosition(onSuccess, onError, options = {}) {
  const mergedOptions = { ...defaultPositionOptions, ...options };

  if (isNativePlatform()) {
    const permission = await ensureLocationPermission();
    if (!permission.granted) {
      const error = new Error('Location permission denied');
      error.code = 1;
      if (typeof onError === 'function') onError(error);
      return null;
    }

    const callbackId = await Geolocation.watchPosition(mergedOptions, (position, error) => {
      if (error) {
        if (typeof onError === 'function') onError(error);
        return;
      }
      if (position && typeof onSuccess === 'function') onSuccess(position);
    });

    return callbackId;
  }

  if (!hasBrowserGeolocation()) {
    const error = new Error('Geolocation is not supported');
    if (typeof onError === 'function') onError(error);
    return null;
  }

  return navigator.geolocation.watchPosition(onSuccess, onError, mergedOptions);
}

export async function clearDeviceWatch(watchId) {
  if (watchId === null || typeof watchId === 'undefined') return;

  if (isNativePlatform()) {
    await Geolocation.clearWatch({ id: String(watchId) });
    return;
  }

  if (hasBrowserGeolocation()) {
    navigator.geolocation.clearWatch(watchId);
  }
}