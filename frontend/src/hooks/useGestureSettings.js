/**
 * useGestureSettings Hook
 *
 * Manages gesture customization settings with localStorage persistence
 */

import { useEffect, useState, useCallback } from 'react';
import {
  DEFAULT_GESTURE_SETTINGS,
  loadGestureSettings,
  saveGestureSettings,
  validateGestureSettings,
} from '../utils/gestureCustomization';

export function useGestureSettings() {
  const [settings, setSettings] = useState(() => loadGestureSettings());

  // Load settings on mount
  useEffect(() => {
    const loaded = loadGestureSettings();
    setSettings(loaded);
  }, []);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      const validated = validateGestureSettings(updated);
      saveGestureSettings(validated);
      return validated;
    });
  }, []);

  const updateMultipleSettings = useCallback((updates) => {
    setSettings((prev) => {
      const updated = { ...prev, ...updates };
      const validated = validateGestureSettings(updated);
      saveGestureSettings(validated);
      return validated;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    const defaults = validateGestureSettings(DEFAULT_GESTURE_SETTINGS);
    setSettings(defaults);
    saveGestureSettings(defaults);
  }, []);

  return {
    settings,
    updateSetting,
    updateMultipleSettings,
    resetToDefaults,
  };
}

export default useGestureSettings;

