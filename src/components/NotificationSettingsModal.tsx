/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Volume2,
  VolumeX,
  Play,
  Check,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sliders,
  Radio
} from 'lucide-react';
import { SoundProfile, NotificationSettings } from '../types';
import {
  getStoredNotificationSettings,
  saveNotificationSettings,
  playAlertSound,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../lib/soundAlerts';
import {
  isBrowserNotificationSupported,
  getNotificationPermission,
  requestBrowserNotificationPermission,
  triggerNotificationAlert,
} from '../lib/notifications';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getStoredNotificationSettings());
      setPermission(getNotificationPermission());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSoundToggle = () => {
    const updated = { ...settings, soundEnabled: !settings.soundEnabled };
    setSettings(updated);
    saveNotificationSettings(updated);
    if (updated.soundEnabled) {
      playAlertSound(updated.soundProfile, updated.volume);
    }
  };

  const handleProfileSelect = (profile: SoundProfile) => {
    const updated = { ...settings, soundProfile: profile };
    setSettings(updated);
    saveNotificationSettings(updated);
    playAlertSound(profile, settings.volume);
  };

  const handleVolumeChange = (newVolume: number) => {
    const updated = { ...settings, volume: newVolume };
    setSettings(updated);
    saveNotificationSettings(updated);
  };

  const handleBrowserNotifToggle = () => {
    const updated = {
      ...settings,
      browserNotificationsEnabled: !settings.browserNotificationsEnabled,
    };
    setSettings(updated);
    saveNotificationSettings(updated);
  };

  const handleRequestPermission = async () => {
    const res = await requestBrowserNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      const updated = { ...settings, browserNotificationsEnabled: true };
      setSettings(updated);
      saveNotificationSettings(updated);
      triggerNotificationAlert('Notifications Enabled!', 'You will now receive sound and system alerts for scheduled tasks and notes.');
    }
  };

  const handleTestNotification = () => {
    triggerNotificationAlert(
      'Executive Alert Test',
      'This is a preview sound & alert chime for your scheduled tasks and notes.',
      {
        playSound: settings.soundEnabled,
      }
    );
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const soundProfiles: { id: SoundProfile; name: string; desc: string }[] = [
    { id: 'chime', name: 'Crystal Chime', desc: 'Harmonic sine bell tones with gentle resonance' },
    { id: 'pulse', name: 'Digital Pulse', desc: 'Modern dual-rhythm focused audio tick' },
    { id: 'fanfare', name: 'Victory Fanfare', desc: 'Upbeat 4-tone triumphant arpeggio' },
    { id: 'marimba', name: 'Warm Marimba', desc: 'Acoustic wood-block pleasant percussive tap' },
  ];

  const isSupported = isBrowserNotificationSupported();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Sound & Notification Settings
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Reminders, audio melodies, and browser alert permissions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Audio Sound Master Toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-850/50">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  settings.soundEnabled
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Synthesized Audio Alerts
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Plays tone when reminders trigger (Web Audio API)
                </p>
              </div>
            </div>

            <button
              onClick={handleSoundToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.soundEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Sound Profile Melody Selector */}
          {settings.soundEnabled && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Choose Alert Melody
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {soundProfiles.map((sp) => {
                  const isSelected = settings.soundProfile === sp.id;
                  return (
                    <div
                      key={sp.id}
                      onClick={() => handleProfileSelect(sp.id)}
                      className={`cursor-pointer rounded-xl border p-3 transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/40'
                          : 'border-slate-200 hover:border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Radio
                            className={`h-3.5 w-3.5 ${
                              isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {sp.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playAlertSound(sp.id, settings.volume);
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-900"
                          title="Preview tone"
                        >
                          <Play className="h-3 w-3 fill-current" />
                        </button>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        {sp.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Volume Slider */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <Sliders className="h-3.5 w-3.5" />
                    Alert Volume
                  </span>
                  <span>{Math.round(settings.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={settings.volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  onMouseUp={() => playAlertSound(settings.soundProfile, settings.volume)}
                  className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600 dark:bg-slate-700"
                />
              </div>
            </div>
          )}

          {/* Web Browser HTML5 Notification Permission Status */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-850/50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Browser Native Notifications
                  </span>
                  {permission === 'granted' ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <ShieldCheck className="h-3 w-3" /> Granted
                    </span>
                  ) : permission === 'denied' ? (
                    <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      <ShieldAlert className="h-3 w-3" /> Blocked
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      Needs Permission
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Show banner popups even when the browser tab is in the background.
                </p>
              </div>

              {permission !== 'granted' && isSupported && (
                <button
                  onClick={handleRequestPermission}
                  className="shrink-0 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500"
                >
                  Enable
                </button>
              )}
            </div>
          </div>

          {/* Test Trigger Button */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleTestNotification}
              className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Test Audio & Browser Alert</span>
            </button>

            {savedSuccess && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" /> Alert Dispatched
              </span>
            )}

            <button
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
