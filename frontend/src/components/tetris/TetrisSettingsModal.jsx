/**
 * TetrisSettingsModal Component
 *
 * Game settings and preferences
 */

import { X, Volume2, VolumeX, Vibrate } from "lucide-react";
import { useEffect, useState } from "react";

export default function TetrisSettingsModal({
  isVisible,
  onClose,
  soundEnabled,
  onSoundToggle,
  hapticEnabled,
  onHapticToggle,
}) {
  const [localSound, setLocalSound] = useState(soundEnabled);
  const [localHaptic, setLocalHaptic] = useState(hapticEnabled);

  useEffect(() => {
    setLocalSound(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    setLocalHaptic(hapticEnabled);
  }, [hapticEnabled]);

  const handleSoundChange = () => {
    const newValue = !localSound;
    setLocalSound(newValue);
    onSoundToggle?.();
  };

  const handleHapticChange = () => {
    const newValue = !localHaptic;
    setLocalHaptic(newValue);
    onHapticToggle?.();
  };

  if (!isVisible) return null;

  return (
    <div className="tetris-settings-overlay">
      <div className="tetris-settings-modal">
        <div className="tetris-settings-header">
          <h2>Settings</h2>
          <button
            type="button"
            className="tetris-modal-close tetris-settings-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        <div className="tetris-settings-content">
          {/* Audio Settings */}
          <section className="tetris-settings-section">
            <h3>Audio</h3>
            <div className="tetris-settings-group">
              <label className="tetris-setting-item">
                <input
                  type="checkbox"
                  checked={localSound}
                  onChange={handleSoundChange}
                  className="tetris-checkbox"
                />
                <div className="tetris-setting-icon">
                  {localSound ? (
                    <Volume2 size={20} />
                  ) : (
                    <VolumeX size={20} />
                  )}
                </div>
                <div className="tetris-setting-label">
                  <span className="tetris-setting-title">Sound Effects</span>
                  <span className="tetris-setting-desc">
                    {localSound ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </label>
            </div>
          </section>

          {/* Haptic Settings */}
          <section className="tetris-settings-section">
            <h3>Haptics</h3>
            <div className="tetris-settings-group">
              <label className="tetris-setting-item">
                <input
                  type="checkbox"
                  checked={localHaptic}
                  onChange={handleHapticChange}
                  className="tetris-checkbox"
                />
                <div className="tetris-setting-icon">
                  <Vibrate size={20} />
                </div>
                <div className="tetris-setting-label">
                  <span className="tetris-setting-title">Vibration</span>
                  <span className="tetris-setting-desc">
                    {localHaptic ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </label>
            </div>
          </section>

          {/* Game Info */}
          <section className="tetris-settings-section tetris-settings-info">
            <h3>Game Info</h3>
            <div className="tetris-info-list">
              <div className="tetris-info-item">
                <span className="tetris-info-label">Version:</span>
                <span className="tetris-info-value">1.0.0</span>
              </div>
              <div className="tetris-info-item">
                <span className="tetris-info-label">Leaderboard:</span>
                <span className="tetris-info-value">Global</span>
              </div>
            </div>
          </section>
        </div>

        <div className="tetris-settings-footer">
          <button
            type="button"
            className="tetris-settings-close-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

