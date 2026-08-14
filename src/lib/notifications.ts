/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { playAlertSound, getStoredNotificationSettings } from './soundAlerts';

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function hasNotificationPermission(): boolean {
  return getNotificationPermission() === 'granted';
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

/**
 * Dispatch a notification via Browser HTML5 Notification API + Audio Tone
 */
export function triggerNotificationAlert(
  title: string,
  body: string,
  options?: {
    tag?: string;
    playSound?: boolean;
    onClick?: () => void;
  }
) {
  const settings = getStoredNotificationSettings();

  // 1. Play synthesized audio alert
  if (options?.playSound !== false && settings.soundEnabled) {
    playAlertSound(settings.soundProfile, settings.volume);
  }

  // 2. Display Web Browser Native Notification if allowed
  if (
    isBrowserNotificationSupported() &&
    Notification.permission === 'granted' &&
    settings.browserNotificationsEnabled
  ) {
    try {
      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: options?.tag || `reminder-${Date.now()}`,
        requireInteraction: false,
      });

      if (options?.onClick) {
        notif.onclick = () => {
          window.focus();
          options.onClick?.();
          notif.close();
        };
      }
    } catch (err) {
      console.warn('Unable to fire browser notification (sandbox restriction or permission denied):', err);
    }
  }
}
