import { useState, useCallback, useRef } from "react";

/**
 * useTetrisAudio Hook
 *
 * Manages game sound effects and audio state
 *
 * Returns: {
 *   soundEnabled: boolean,
 *   setSoundEnabled: function,
 *   toggleSound: function,
 *   emitSound: function,
 * }
 */
export function useTetrisAudio() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("tetris-sound-enabled");
    return stored === null ? true : stored === "true";
  });

  const audioContextRef = useRef(null);

  // Initialize Web Audio API
  const getAudioContext = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;

    if (typeof window === "undefined" || !("AudioContext" in window) && !("webkitAudioContext" in window)) {
      return null;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass();
      audioContextRef.current = context;
      return context;
    } catch {
      return null;
    }
  }, []);

  // Play a simple beep sound using Web Audio API
  const emitSound = useCallback((type = "tap") => {
    if (!soundEnabled) return;

    const context = getAudioContext();
    if (!context) return;

    try {
      // Resume audio context if needed (required by some browsers)
      if (context.state === "suspended") {
        context.resume();
      }

      const now = context.currentTime;
      const soundConfigs = {
        tap: { freq: 600, duration: 0.05, gain: 0.3 },
        pause: { freq: 400, duration: 0.1, gain: 0.2 },
        resume: { freq: 800, duration: 0.1, gain: 0.2 },
        lock: { freq: 500, duration: 0.15, gain: 0.25 },
        clear: { freq: 900, duration: 0.2, gain: 0.3 },
        start: { freq: 700, duration: 0.15, gain: 0.3 },
        reset: { freq: 400, duration: 0.1, gain: 0.2 },
        gameOver: { freq: 200, duration: 0.3, gain: 0.25 },
      };

      const config = soundConfigs[type] || soundConfigs.tap;

      // Create oscillator
      const osc = context.createOscillator();
      osc.frequency.value = config.freq;
      osc.type = "sine";

      // Create gain envelope
      const gain = context.createGain();
      gain.gain.setValueAtTime(config.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + config.duration);

      // Connect and play
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(now);
      osc.stop(now + config.duration);
    } catch {
      // Silently fail if audio isn't available
    }
  }, [soundEnabled, getAudioContext]);

  const toggleSound = useCallback(() => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem("tetris-sound-enabled", String(newState));
    if (newState) {
      emitSound("tap");
    }
  }, [soundEnabled, emitSound]);

  return {
    soundEnabled,
    setSoundEnabled,
    toggleSound,
    emitSound,
  };
}

export default useTetrisAudio;

