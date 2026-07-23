"use strict";

const CURVES = {
  linear: (t) => t,
  soft: (t) => Math.pow(t, 0.55),
  hard: (t) => Math.pow(t, 1.65),
  firm: (t) => 0.15 + Math.pow(t, 1.2) * 0.85
};

function normalizePressure(raw, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback != null ? fallback : 1;
  return Math.max(0.01, Math.min(1, n));
}

function applyPressure(raw, curveName) {
  const t = normalizePressure(raw, 1);
  const fn = CURVES[curveName] || CURVES.firm;
  return Math.max(0.01, Math.min(1, fn(t)));
}

function brushRadius(size, pressure, curveName, minFrac) {
  const base = Math.max(1, Number(size) || 8);
  const p = applyPressure(pressure, curveName);
  const frac = minFrac != null ? minFrac : 0.28;
  return base * (frac + p * (1 - frac)) * 0.5;
}

function brushAlpha(opacity, pressure, curveName) {
  const base = Math.max(0, Math.min(1, Number(opacity) || 1));
  const p = applyPressure(pressure, curveName);
  return base * (0.2 + p * 0.8);
}

module.exports = {
  CURVES,
  applyPressure,
  brushRadius,
  brushAlpha,
  normalizePressure
};
