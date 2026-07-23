"use strict";

/**
 * Centralni uloziste hesel MIA (cita z .env).
 * Master heslo: MIA_MASTER_PASSWORD
 */

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function masterPassword() {
  return safeString(process.env.MIA_MASTER_PASSWORD);
}

function ingestSecret() {
  return safeString(process.env.MIA_INGEST_SECRET) || masterPassword();
}

function obsWsPassword() {
  return safeString(process.env.OBS_WS_PASSWORD);
}

function crdPin() {
  return safeString(process.env.MIA_CRD_PIN) || masterPassword();
}

function getVaultSnapshot() {
  return {
    master: Boolean(masterPassword()),
    ingestSecret: Boolean(ingestSecret()),
    obsWsPassword: Boolean(obsWsPassword()),
    crdPin: Boolean(crdPin()),
    tailscaleDns: "laptop-0k9hiohe.tailb0a7c8.ts.net",
    tailscaleIp: "100.93.161.52"
  };
}

module.exports = {
  masterPassword,
  ingestSecret,
  obsWsPassword,
  crdPin,
  getVaultSnapshot
};
