"use strict";

/**
 * Master Canon 0055 — Configuration Manager: sole authority for load/validate/store/version/distribute config.
 * No service may read configuration files directly.
 */

const crypto = require("crypto");

const CM_COMPONENT = Object.freeze({
  CONFIGURATION_MANAGER: "configuration_manager",
  LAYER_MERGER: "layer_merger",
  VALIDATOR: "validator",
  RUNTIME_CONFIG: "runtime_config",
  SECRETS_STORE: "secrets_store",
  FEATURE_FLAGS: "feature_flags",
  VERSION_STORE: "version_store",
  HOT_RELOAD: "hot_reload",
  AUDIT_LOG: "audit_log",
  METRICS: "metrics",
  SECURITY_GATE: "security_gate",
  DISTRIBUTION_API: "distribution_api"
});

const CM_COMPONENT_ORDER = Object.freeze(Object.values(CM_COMPONENT));

const CM_LAYER = Object.freeze({
  SYSTEM_DEFAULTS: "system_defaults",
  ENVIRONMENT: "environment",
  INSTALLATION: "installation",
  USER: "user",
  RUNTIME_OVERRIDES: "runtime_overrides",
  SESSION_OVERRIDES: "session_overrides"
});

const CM_LAYER_ORDER = Object.freeze([
  CM_LAYER.SYSTEM_DEFAULTS,
  CM_LAYER.ENVIRONMENT,
  CM_LAYER.INSTALLATION,
  CM_LAYER.USER,
  CM_LAYER.RUNTIME_OVERRIDES,
  CM_LAYER.SESSION_OVERRIDES
]);

const CM_CATEGORY = Object.freeze({
  CORE: "core",
  PLATFORM: "platform",
  GAMEPLAY: "gameplay",
  PRESENTATION: "presentation",
  AI: "ai",
  DEVELOPER: "developer"
});

const CM_VALUE_TYPE = Object.freeze({
  STRING: "string",
  INTEGER: "integer",
  FLOAT: "float",
  BOOLEAN: "boolean",
  ENUM: "enum",
  ARRAY: "array",
  OBJECT: "object",
  DURATION: "duration",
  FILE_PATH: "filepath",
  URL: "url"
});

const CM_PUBLIC_API = Object.freeze([
  "load",
  "get",
  "set",
  "getRuntimeConfiguration",
  "setFeatureFlag",
  "getFeatureFlag",
  "setSecret",
  "getSecret",
  "restoreVersion",
  "auditTrail",
  "metrics"
]);

const CM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-configuration-core/configurationManager.js",
  "scripts/MIA_CONFIG.js",
  "docs/master-canon/0055-configuration-manager.md"
]);

const CM_KERNEL_KEYS = Object.freeze([
  "kernel.mode",
  "runtime.workers",
  "logging.level",
  "recovery.enabled"
]);

const CM_HOT_RELOADABLE = Object.freeze([
  "presentation.volume",
  "presentation.overlay.enabled",
  "gameplay.battle.difficulty",
  "feature.BattleV2",
  "feature.ExperimentalOverlay",
  "feature.AIReasoning"
]);

const CM_WRITE_PERMISSIONS = Object.freeze([
  "config.write",
  "config.admin",
  "kernel.config"
]);

function checksumOf(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

function assertDirectFileReadForbidden(activity) {
  if (activity === "read_config_file_directly" || activity === "fs_read_config") {
    return { ok: false, error: "direct_config_file_read_forbidden" };
  }
  return { ok: true };
}

function validateConfigValue(type, value, rules = {}) {
  const t = String(type || "").toLowerCase();
  switch (t) {
    case CM_VALUE_TYPE.STRING:
      if (typeof value !== "string") return { ok: false, error: "type_mismatch" };
      break;
    case CM_VALUE_TYPE.INTEGER:
      if (!Number.isInteger(value)) return { ok: false, error: "type_mismatch" };
      break;
    case CM_VALUE_TYPE.FLOAT:
      if (typeof value !== "number" || Number.isNaN(value)) return { ok: false, error: "type_mismatch" };
      break;
    case CM_VALUE_TYPE.BOOLEAN:
      if (typeof value !== "boolean") return { ok: false, error: "type_mismatch" };
      break;
    case CM_VALUE_TYPE.ENUM:
      if (!Array.isArray(rules.allowed) || !rules.allowed.includes(value)) {
        return { ok: false, error: "enum_not_allowed" };
      }
      break;
    case CM_VALUE_TYPE.ARRAY:
      if (!Array.isArray(value)) return { ok: false, error: "type_mismatch" };
      break;
    case CM_VALUE_TYPE.OBJECT:
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { ok: false, error: "type_mismatch" };
      }
      break;
    case CM_VALUE_TYPE.DURATION:
      if (!Number.isFinite(value) || value < 0) return { ok: false, error: "invalid_duration" };
      break;
    case CM_VALUE_TYPE.FILE_PATH:
      if (typeof value !== "string" || !value.trim()) return { ok: false, error: "invalid_filepath" };
      break;
    case CM_VALUE_TYPE.URL:
      if (typeof value !== "string" || !/^https?:\/\//i.test(value)) {
        return { ok: false, error: "invalid_url" };
      }
      break;
    default:
      return { ok: false, error: "unknown_type" };
  }

  if (rules.min != null && typeof value === "number" && value < rules.min) {
    return { ok: false, error: "below_min" };
  }
  if (rules.max != null && typeof value === "number" && value > rules.max) {
    return { ok: false, error: "above_max" };
  }
  if (Array.isArray(rules.allowed) && t !== CM_VALUE_TYPE.ENUM && !rules.allowed.includes(value)) {
    return { ok: false, error: "value_not_allowed" };
  }
  if (rules.dependsOnKey && rules.dependsOnPresent === false) {
    return { ok: false, error: "dependency_missing" };
  }
  if (rules.conflict === true) {
    return { ok: false, error: "conflict" };
  }
  return { ok: true };
}

function createConfigEntry(input = {}) {
  const key = String(input.key || "").trim();
  if (!key) return { ok: false, error: "missing_key" };
  const type = input.type || CM_VALUE_TYPE.STRING;
  const validation = validateConfigValue(type, input.value, input.rules || {});
  if (!validation.ok) return validation;

  const now = Date.now();
  return {
    ok: true,
    entry: Object.freeze({
      configurationId: input.configurationId || `cfg_${key.replace(/\./g, "_")}`,
      key,
      value: input.value,
      type,
      version: Number(input.version) || 1,
      scope: input.scope || CM_CATEGORY.CORE,
      source: input.source || CM_LAYER.SYSTEM_DEFAULTS,
      lastModified: input.lastModified || now,
      modifiedBy: input.modifiedBy || "system",
      hotReloadable: input.hotReloadable === true || CM_HOT_RELOADABLE.includes(key),
      requiresRestart: input.requiresRestart === true || CM_KERNEL_KEYS.includes(key),
      checksum: checksumOf(input.value)
    })
  };
}

function mergeLayers(layerMaps) {
  const merged = {};
  for (const layer of CM_LAYER_ORDER) {
    const map = layerMaps[layer] || {};
    for (const [key, value] of Object.entries(map)) {
      merged[key] = value;
    }
  }
  return merged;
}

function createConfigurationManager(options = {}) {
  const singleton = options.singleton !== false;
  const layers = {
    [CM_LAYER.SYSTEM_DEFAULTS]: {},
    [CM_LAYER.ENVIRONMENT]: {},
    [CM_LAYER.INSTALLATION]: {},
    [CM_LAYER.USER]: {},
    [CM_LAYER.RUNTIME_OVERRIDES]: {},
    [CM_LAYER.SESSION_OVERRIDES]: {}
  };
  const entries = new Map();
  const secrets = new Map();
  const featureFlags = new Map();
  const versions = new Map();
  const audit = [];
  let changeCount = 0;
  let invalidAttempts = 0;
  let runtimeChanges = 0;
  let loadDurationMs = 0;
  let loaded = false;

  function appendAudit(record) {
    audit.push(
      Object.freeze({
        ...record,
        immutable: true,
        at: record.at || Date.now()
      })
    );
  }

  function rebuildRuntime() {
    const flat = mergeLayers(layers);
    for (const [key, value] of Object.entries(flat)) {
      const existing = entries.get(key);
      const built = createConfigEntry({
        key,
        value: typeof value === "object" && value !== null && "value" in value ? value.value : value,
        type: (value && value.type) || (existing && existing.type) || inferType(value),
        version: existing ? existing.version : 1,
        scope: (value && value.scope) || (existing && existing.scope) || CM_CATEGORY.CORE,
        source: (value && value.source) || (existing && existing.source) || CM_LAYER.SYSTEM_DEFAULTS,
        modifiedBy: existing ? existing.modifiedBy : "system",
        hotReloadable: existing ? existing.hotReloadable : CM_HOT_RELOADABLE.includes(key),
        requiresRestart: existing ? existing.requiresRestart : CM_KERNEL_KEYS.includes(key),
        rules: value && value.rules
      });
      if (built.ok) {
        entries.set(key, built.entry);
      }
    }
  }

  function inferType(value) {
    if (typeof value === "boolean") return CM_VALUE_TYPE.BOOLEAN;
    if (Number.isInteger(value)) return CM_VALUE_TYPE.INTEGER;
    if (typeof value === "number") return CM_VALUE_TYPE.FLOAT;
    if (Array.isArray(value)) return CM_VALUE_TYPE.ARRAY;
    if (value && typeof value === "object") return CM_VALUE_TYPE.OBJECT;
    return CM_VALUE_TYPE.STRING;
  }

  function load(layerPayloads = {}) {
    const started = Date.now();
    for (const layer of CM_LAYER_ORDER) {
      if (layerPayloads[layer] && typeof layerPayloads[layer] === "object") {
        layers[layer] = { ...layers[layer], ...layerPayloads[layer] };
      }
    }
    rebuildRuntime();
    loaded = true;
    loadDurationMs = Date.now() - started;
    appendAudit({
      action: "load",
      actor: "boot",
      reason: "startup_load",
      version: 1
    });
    return { ok: true, loaded: true, durationMs: loadDurationMs, keys: entries.size };
  }

  function get(key) {
    const entry = entries.get(key);
    if (!entry) return { ok: false, error: "not_found" };
    return { ok: true, entry, value: entry.value };
  }

  function getRuntimeConfiguration() {
    const snapshot = {};
    for (const [key, entry] of entries) {
      snapshot[key] = entry.value;
    }
    return Object.freeze({
      readOnly: true,
      unified: true,
      immutableWithoutApprovedChange: true,
      values: Object.freeze({ ...snapshot }),
      get(key) {
        return Object.prototype.hasOwnProperty.call(snapshot, key) ? snapshot[key] : undefined;
      }
    });
  }

  function hasWritePermission(actorMeta = {}) {
    if (actorMeta.permission === true) return true;
    const perms = actorMeta.permissions || [];
    return perms.some((p) => CM_WRITE_PERMISSIONS.includes(p));
  }

  function set(key, value, meta = {}) {
    if (!hasWritePermission(meta)) {
      invalidAttempts += 1;
      return { ok: false, error: "unauthorized_write" };
    }

    const existing = entries.get(key);
    const type = meta.type || (existing && existing.type) || inferType(value);
    const rules = meta.rules || {};
    const validation = validateConfigValue(type, value, rules);
    if (!validation.ok) {
      invalidAttempts += 1;
      return validation;
    }

    const hotReloadable =
      meta.hotReloadable === true ||
      (existing && existing.hotReloadable) ||
      CM_HOT_RELOADABLE.includes(key);
    const requiresRestart =
      meta.requiresRestart === true ||
      (existing && existing.requiresRestart) ||
      CM_KERNEL_KEYS.includes(key);

    if (meta.hotReload === true && !hotReloadable) {
      invalidAttempts += 1;
      return { ok: false, error: "hot_reload_not_allowed", requiresRestart: true };
    }

    const previous = existing ? existing.value : undefined;
    const nextVersion = existing ? existing.version + 1 : 1;
    const layer = meta.layer || CM_LAYER.RUNTIME_OVERRIDES;
    layers[layer][key] = { value, type, scope: meta.scope || (existing && existing.scope) || CM_CATEGORY.CORE, source: layer };

    const built = createConfigEntry({
      key,
      value,
      type,
      version: nextVersion,
      scope: meta.scope || (existing && existing.scope) || CM_CATEGORY.CORE,
      source: layer,
      modifiedBy: meta.actor || "unknown",
      hotReloadable,
      requiresRestart,
      rules
    });
    if (!built.ok) {
      invalidAttempts += 1;
      return built;
    }

    entries.set(key, built.entry);

    if (!versions.has(key)) versions.set(key, []);
    versions.get(key).push(
      Object.freeze({
        version: nextVersion,
        value,
        checksum: built.entry.checksum,
        created: existing ? existing.lastModified : built.entry.lastModified,
        modified: built.entry.lastModified,
        author: built.entry.modifiedBy
      })
    );

    changeCount += 1;
    if (layer === CM_LAYER.RUNTIME_OVERRIDES || layer === CM_LAYER.SESSION_OVERRIDES) {
      runtimeChanges += 1;
    }

    appendAudit({
      action: "set",
      actor: built.entry.modifiedBy,
      key,
      previousValue: previous,
      newValue: value,
      reason: meta.reason || "update",
      version: nextVersion
    });

    return {
      ok: true,
      key,
      version: nextVersion,
      hotReloadApplied: hotReloadable && !requiresRestart,
      requiresRestart
    };
  }

  function setFeatureFlag(name, enabled, meta = {}) {
    const key = name.startsWith("feature.") ? name : `feature.${name}`;
    featureFlags.set(key, enabled === true);
    return set(
      key,
      enabled === true,
      {
        ...meta,
        type: CM_VALUE_TYPE.BOOLEAN,
        scope: CM_CATEGORY.DEVELOPER,
        hotReloadable: true,
        layer: CM_LAYER.RUNTIME_OVERRIDES,
        reason: meta.reason || "feature_flag",
        permissions: meta.permissions || ["config.write"]
      }
    );
  }

  function getFeatureFlag(name) {
    const key = name.startsWith("feature.") ? name : `feature.${name}`;
    if (featureFlags.has(key)) {
      return { ok: true, key, enabled: featureFlags.get(key) === true };
    }
    const entry = entries.get(key);
    if (!entry) return { ok: false, error: "flag_not_found", enabled: false };
    return { ok: true, key, enabled: entry.value === true };
  }

  function setSecret(secretId, value, meta = {}) {
    if (!hasWritePermission(meta)) {
      return { ok: false, error: "unauthorized_write" };
    }
    if (entries.has(secretId)) {
      return { ok: false, error: "secret_must_not_live_in_regular_config" };
    }
    secrets.set(secretId, {
      value,
      storedAt: Date.now(),
      modifiedBy: meta.actor || "system"
    });
    appendAudit({
      action: "set_secret",
      actor: meta.actor || "system",
      key: secretId,
      previousValue: "[redacted]",
      newValue: "[redacted]",
      reason: meta.reason || "secret_update",
      version: 1
    });
    return { ok: true, secretId, separated: true };
  }

  function getSecret(secretId, meta = {}) {
    if (!meta.allowSecrets) {
      return { ok: false, error: "secrets_access_denied" };
    }
    if (!secrets.has(secretId)) {
      return { ok: false, error: "secret_not_found" };
    }
    return { ok: true, secretId, value: secrets.get(secretId).value, fromSecretsStore: true };
  }

  function restoreVersion(key, version, meta = {}) {
    if (!hasWritePermission(meta)) {
      return { ok: false, error: "unauthorized_write" };
    }
    const history = versions.get(key) || [];
    const target = history.find((v) => v.version === version);
    if (!target) return { ok: false, error: "version_not_found" };
    return set(key, target.value, {
      ...meta,
      reason: meta.reason || `restore_v${version}`,
      permissions: meta.permissions || ["config.admin"]
    });
  }

  function metrics() {
    let activeFlags = 0;
    for (const enabled of featureFlags.values()) {
      if (enabled) activeFlags += 1;
    }
    for (const [key, entry] of entries) {
      if (key.startsWith("feature.") && entry.value === true && !featureFlags.has(key)) {
        activeFlags += 1;
      }
    }
    return Object.freeze({
      items: entries.size,
      changes: changeCount,
      invalidAttempts,
      loadDurationMs,
      runtimeChanges,
      activeFeatureFlags: activeFlags,
      secrets: secrets.size,
      auditEntries: audit.length
    });
  }

  if (options.seedDefaults !== false) {
    layers[CM_LAYER.SYSTEM_DEFAULTS] = {
      "kernel.mode": { value: "production", type: CM_VALUE_TYPE.ENUM, scope: CM_CATEGORY.CORE, rules: { allowed: ["production", "development", "test"] } },
      "runtime.workers": { value: 2, type: CM_VALUE_TYPE.INTEGER, scope: CM_CATEGORY.CORE, rules: { min: 1, max: 32 } },
      "logging.level": { value: "info", type: CM_VALUE_TYPE.ENUM, scope: CM_CATEGORY.CORE, rules: { allowed: ["debug", "info", "warn", "error"] } },
      "recovery.enabled": { value: true, type: CM_VALUE_TYPE.BOOLEAN, scope: CM_CATEGORY.CORE },
      "presentation.volume": { value: 80, type: CM_VALUE_TYPE.INTEGER, scope: CM_CATEGORY.PRESENTATION, rules: { min: 0, max: 100 } },
      "presentation.overlay.enabled": { value: true, type: CM_VALUE_TYPE.BOOLEAN, scope: CM_CATEGORY.PRESENTATION },
      "gameplay.battle.difficulty": { value: "normal", type: CM_VALUE_TYPE.ENUM, scope: CM_CATEGORY.GAMEPLAY, rules: { allowed: ["easy", "normal", "hard"] } },
      "feature.BattleV2": { value: true, type: CM_VALUE_TYPE.BOOLEAN, scope: CM_CATEGORY.GAMEPLAY },
      "feature.ExperimentalOverlay": { value: false, type: CM_VALUE_TYPE.BOOLEAN, scope: CM_CATEGORY.PRESENTATION },
      "feature.AIReasoning": { value: true, type: CM_VALUE_TYPE.BOOLEAN, scope: CM_CATEGORY.AI },
      "platform.tiktok.enabled": { value: true, type: CM_VALUE_TYPE.BOOLEAN, scope: CM_CATEGORY.PLATFORM },
      "ai.decision.temperature": { value: 0.7, type: CM_VALUE_TYPE.FLOAT, scope: CM_CATEGORY.AI, rules: { min: 0, max: 2 } }
    };
    featureFlags.set("feature.BattleV2", true);
    featureFlags.set("feature.ExperimentalOverlay", false);
    featureFlags.set("feature.AIReasoning", true);
    load();
  }

  return {
    load,
    get,
    set,
    getRuntimeConfiguration,
    setFeatureFlag,
    getFeatureFlag,
    setSecret,
    getSecret,
    restoreVersion,
    validateConfigValue,
    assertDirectFileReadForbidden,
    mergeLayers: () => mergeLayers(layers),
    auditTrail() {
      return Object.freeze([...audit]);
    },
    listVersions(key) {
      return Object.freeze([...(versions.get(key) || [])]);
    },
    metrics,
    status() {
      return Object.freeze({
        singleton,
        loaded,
        soleAuthority: true,
        directFileReadAllowed: false,
        component: CM_COMPONENT.CONFIGURATION_MANAGER,
        layers: CM_LAYER_ORDER.length
      });
    },
    snapshot() {
      return Object.freeze({
        ok: true,
        singleton,
        metrics: metrics(),
        runtimeKeys: entries.size
      });
    }
  };
}

module.exports = {
  CM_COMPONENT,
  CM_COMPONENT_ORDER,
  CM_LAYER,
  CM_LAYER_ORDER,
  CM_CATEGORY,
  CM_VALUE_TYPE,
  CM_PUBLIC_API,
  CM_RUNTIME_ANCHORS,
  CM_KERNEL_KEYS,
  CM_HOT_RELOADABLE,
  CM_WRITE_PERMISSIONS,
  assertDirectFileReadForbidden,
  validateConfigValue,
  createConfigEntry,
  mergeLayers,
  createConfigurationManager
};
