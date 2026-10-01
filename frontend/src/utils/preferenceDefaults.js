export function createDefaultBestRun() {
  return { score: 0, level: 1, lines: 0 };
}

export function parseSoundEnabledPreference(value) {
  return value === "true";
}

export function parseBestRunPreference(value) {
  const parsedValue = JSON.parse(value);

  return {
    score: Number(parsedValue?.score) || 0,
    level: Number(parsedValue?.level) || 1,
    lines: Number(parsedValue?.lines) || 0,
  };
}

