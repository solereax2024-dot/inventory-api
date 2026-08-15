import { Moon, Sun } from "lucide-react";
import { THEMES } from "../constants/themes";
import "./ThemeColorPicker.css";

export default function ThemeColorPicker({ activeTheme, onThemeChange, isDarkMode, onModeChange }) {
  const entries = Object.entries(THEMES);
  const selectedTheme = THEMES[activeTheme] || THEMES[entries[0][0]];

  return (
    <div className="theme-color-picker">
      <div className="theme-picker-header">
        <h3>Pro Color Palette</h3>
        <p>{entries.length} colors, tap any swatch to repaint the whole UI</p>
      </div>

      <div className="theme-mode-toggle" role="group" aria-label="Theme mode">
        <button
          type="button"
          className={`theme-mode-btn ${!isDarkMode ? "active" : ""}`}
          onClick={() => onModeChange(false)}
          aria-pressed={!isDarkMode}
        >
          <Sun size={14} />
          <span>Day</span>
        </button>
        <button
          type="button"
          className={`theme-mode-btn ${isDarkMode ? "active" : ""}`}
          onClick={() => onModeChange(true)}
          aria-pressed={isDarkMode}
        >
          <Moon size={14} />
          <span>Night</span>
        </button>
      </div>

      <div className="theme-colors-palette" role="listbox" aria-label="Theme colors">
        {entries.map(([key, theme]) => (
          <button
            key={key}
            className={`theme-color-option quick-tooltip ${activeTheme === key ? 'active' : ''}`}
            style={{ '--theme-color': theme.hex }}
            onClick={() => onThemeChange(key)}
            data-tooltip={theme.name}
            role="option"
            aria-selected={activeTheme === key}
            aria-label={`${theme.name} theme`}
          >
            <span className="color-dot" aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="theme-selected-meta">
        <span className="theme-selected-chip" style={{ '--theme-color': selectedTheme.hex }} aria-hidden="true" />
        <p>
          Active: <strong>{selectedTheme.name}</strong>
        </p>
      </div>
    </div>
  );
}

