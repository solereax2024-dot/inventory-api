import { useState } from "react";
import { Moon, Sun, Sparkles } from "lucide-react";
import { THEMES } from "../constants/themes";
import "./WelcomeThemeModal.css";

export default function WelcomeThemeModal({ activeTheme, isDarkMode, onThemeChange, onModeChange, onClose }) {
  const entries = Object.entries(THEMES);
  const [hovered, setHovered] = useState(null);
  const previewKey = hovered || activeTheme;
  const previewTheme = THEMES[previewKey] || THEMES[entries[0][0]];

  const handlePick = (key) => {
    onThemeChange(key);
    onClose();
  };

  return (
    <div className="wtm-backdrop">
      <div className="wtm-panel" style={{ "--wtm-accent": previewTheme.hex, "--wtm-soft": previewTheme.primarySoft }}>
        {/* Header */}
        <div className="wtm-header">
          <span className="wtm-icon"><Sparkles size={22} /></span>
          <div>
            <h2 className="wtm-title">Welcome to Sole Reax PH!</h2>
            <p className="wtm-sub">Pick a color theme to personalize your experience.</p>
          </div>
        </div>

        {/* Day / Night toggle */}
        <div className="wtm-mode-row">
          <button
            type="button"
            className={`wtm-mode-btn ${!isDarkMode ? "active" : ""}`}
            onClick={() => onModeChange(false)}
          >
            <Sun size={15} /> Day
          </button>
          <button
            type="button"
            className={`wtm-mode-btn ${isDarkMode ? "active" : ""}`}
            onClick={() => onModeChange(true)}
          >
            <Moon size={15} /> Night
          </button>
        </div>

        {/* Color palette */}
        <div className="wtm-palette">
          {entries.map(([key, theme]) => (
            <button
              key={key}
              type="button"
              className={`wtm-swatch ${activeTheme === key ? "selected" : ""}`}
              style={{ "--swatch-color": theme.hex }}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handlePick(key)}
              title={theme.name}
              aria-label={theme.name}
            >
              <span className="wtm-dot" />
              {activeTheme === key && <span className="wtm-check">✓</span>}
            </button>
          ))}
        </div>

        {/* Preview label */}
        <p className="wtm-preview-label">
          <span className="wtm-preview-chip" style={{ background: previewTheme.hex }} />
          {previewTheme.name}
        </p>

        {/* Actions */}
        <div className="wtm-actions">
          <button type="button" className="wtm-btn-primary" onClick={() => handlePick(activeTheme)}>
            Use This Theme
          </button>
          <button type="button" className="wtm-btn-skip" onClick={onClose}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

