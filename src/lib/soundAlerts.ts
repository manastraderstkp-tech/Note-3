/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SoundProfile, NotificationSettings } from '../types';

const STORAGE_SETTINGS_KEY = 'workspace_notification_settings';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  soundProfile: 'chime',
  volume: 0.8,
  browserNotificationsEnabled: true,
};

export function getStoredNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Error reading notification settings', e);
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export const getSoundSettings = getStoredNotificationSettings;

export function saveNotificationSettings(settings: NotificationSettings) {
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving notification settings', e);
  }
}

// Singleton AudioContext for Web Audio API
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContextClass();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      // Browsers may require user gesture
    });
  }

  return audioCtx;
}

/**
 * Play a synthesized sound tone using the Web Audio API
 */
export function playAlertSound(profile?: SoundProfile, customVolume?: number) {
  try {
    const settings = getStoredNotificationSettings();
    if (!settings.soundEnabled && customVolume === undefined) {
      return;
    }

    const activeProfile = profile || settings.soundProfile || 'chime';
    const volume = customVolume !== undefined ? customVolume : settings.volume;

    const ctx = getAudioContext();
    if (!ctx) return;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.01, Math.min(1, volume * 0.4)), ctx.currentTime);
    masterGain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (activeProfile) {
      case 'chime': {
        // High crystal bell tone with harmonic overtone
        const notes = [
          { freq: 659.25, time: 0.0, dur: 0.8 },  // E5
          { freq: 880.00, time: 0.12, dur: 1.0 },  // A5
          { freq: 1318.51, time: 0.25, dur: 1.2 }, // E6
        ];

        notes.forEach(({ freq, time, dur }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + time);

          gain.gain.setValueAtTime(0, now + time);
          gain.gain.linearRampToValueAtTime(0.7, now + time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now + time);
          osc.stop(now + time + dur);
        });
        break;
      }

      case 'pulse': {
        // Double modern alert pulse
        const pulses = [0, 0.18];
        pulses.forEach((timeOffset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(587.33, now + timeOffset); // D5
          osc.frequency.exponentialRampToValueAtTime(880, now + timeOffset + 0.1);

          gain.gain.setValueAtTime(0, now + timeOffset);
          gain.gain.linearRampToValueAtTime(0.8, now + timeOffset + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.14);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now + timeOffset);
          osc.stop(now + timeOffset + 0.15);
        });
        break;
      }

      case 'fanfare': {
        // Upbeat 4-note ascending fanfare
        const notes = [
          { freq: 523.25, time: 0.0, dur: 0.15 },  // C5
          { freq: 659.25, time: 0.12, dur: 0.15 }, // E5
          { freq: 783.99, time: 0.24, dur: 0.2 },  // G5
          { freq: 1046.50, time: 0.38, dur: 0.8 }, // C6
        ];

        notes.forEach(({ freq, time, dur }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + time);

          gain.gain.setValueAtTime(0, now + time);
          gain.gain.linearRampToValueAtTime(0.75, now + time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now + time);
          osc.stop(now + time + dur);
        });
        break;
      }

      case 'marimba': {
        // Warm wooden strike notes
        const notes = [
          { freq: 440.00, time: 0.0, dur: 0.3 }, // A4
          { freq: 659.25, time: 0.1, dur: 0.4 }, // E5
        ];

        notes.forEach(({ freq, time, dur }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + time);

          gain.gain.setValueAtTime(0.9, now + time);
          gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now + time);
          osc.stop(now + time + dur);
        });
        break;
      }
    }
  } catch (err) {
    console.warn('Audio alert could not play:', err);
  }
}
