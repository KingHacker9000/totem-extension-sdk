const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const EVENT_RE = /^[a-z0-9][a-z0-9_.-]*$/;
const VERSION_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export const EXTENSION_SCHEMA_V0 = "totem.extension/v0";
export const SDK_VERSION = "0.2.0";

export const BASE_PERMISSIONS = Object.freeze([
  "network.internet",
  "network.local",
  "filesystem.read",
  "filesystem.write",
  "shell.user",
  "system.service",
  "system.package_install",
  "system.root",
  "display.present",
  "audio.play",
  "mcp.register",
  "agent.tools.register",
  "tasks.create",
  "tasks.interrupt",
]);

const BASE_PERMISSION_SET = new Set(BASE_PERMISSIONS);
const TOP_LEVEL_FIELDS = new Set([
  "schema",
  "id",
  "name",
  "version",
  "compatibility",
  "enabledByDefault",
  "entrypoints",
  "lifecycle",
  "permissions",
  "events",
  "contributions",
  "settings",
  "secrets",
  "mcp",
]);

function diag(severity, code, path, message) {
  return { severity, code, path, message };
}

function parseVersion(value) {
  if (typeof value !== "string") return null;
  const match = VERSION_RE.exec(value);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function compareVersion(a, b) {
  for (const key of ["major", "minor", "patch"]) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
  }
  return 0;
}

function parseComparator(token) {
  const match = /^(>=|<=|>|<|=|\^|~)?(\d+\.\d+\.\d+)$/.exec(token.trim());
  if (!match) return null;
  return { op: match[1] || "=", version: parseVersion(match[2]) };
}

export function isValidSemver(value) {
  return parseVersion(value) !== null;
}

export function isValidSemverRange(range) {
  return (
    typeof range === "string" &&
    range.trim() !== "" &&
    range
      .trim()
      .split(/\s+/)
      .every((token) => parseComparator(token) !== null)
  );
}

export function satisfiesSemverRange(version, range) {
  const actual = parseVersion(version);
  if (!actual || !isValidSemverRange(range)) return false;

  return range
    .trim()
    .split(/\s+/)
    .every((token) => {
      const comparator = parseComparator(token);
      const expected = comparator.version;
      const cmp = compareVersion(actual, expected);
      switch (comparator.op) {
        case ">=": return cmp >= 0;
        case "<=": return cmp <= 0;
        case ">": return cmp > 0;
        case "<": return cmp < 0;
        case "=": return cmp === 0;
        case "^":
          return actual.major === expected.major && cmp >= 0;
        case "~":
          return actual.major === expected.major && actual.minor === expected.minor && cmp >= 0;
        default:
          return false;
      }
    });
}

export function isKnownPermission(permission) {
  if (typeof permission !== "string") return false;
  if (BASE_PERMISSION_SET.has(permission)) return true;
  if (!permission.startsWith("secrets.read:")) return false;
  const id = permission.slice("secrets.read:".length);
  return ID_RE.test(id);
}

function checkObjectShape(value, path, allowed, diagnostics) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    diagnostics.push(diag("error", "shape_invalid", path, `${path} must be an object`));
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      diagnostics.push(diag("error", "unknown_sensitive_field", `${path}.${key}`, `Unknown field '${key}' is not allowed in ${path}`));
    }
  }
  return true;
}

function validateStringList(value, path, diagnostics, validator, invalidCode) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    diagnostics.push(diag("error", "shape_invalid", path, `${path} must be an array`));
    return [];
  }
  const seen = new Set();
  const accepted = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    const itemPath = `${path}[${index}]`;
    if (typeof item !== "string" || !validator(item)) {
      diagnostics.push(diag("error", invalidCode, itemPath, `Invalid value '${String(item)}'`));
      continue;
    }
    if (seen.has(item)) {
      diagnostics.push(diag("error", `${invalidCode.replace("_unknown", "")}_duplicate`, itemPath, `Duplicate value '${item}'`));
      continue;
    }
    seen.add(item);
    accepted.push(item);
  }
  return accepted;
}

export function validateManifest(input, options = {}) {
  const diagnostics = [];
  let manifest = input;

  if (typeof input === "string") {
    try {
      manifest = JSON.parse(input);
    } catch (error) {
      return { ok: false, manifest: null, diagnostics: [diag("error", "json_invalid", "$", error.message)] };
    }
  }

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { ok: false, manifest: null, diagnostics: [diag("error", "shape_invalid", "$", "Manifest must be an object")] };
  }

  for (const key of Object.keys(manifest)) {
    if (!TOP_LEVEL_FIELDS.has(key)) {
      const migration = key === "entrypoint" || key === "capabilities";
      diagnostics.push(diag(migration ? "warning" : "warning", migration ? "phase1_stub_manifest" : "unknown_field", key, migration ? `Phase 1 field '${key}' must be migrated and grants no authority` : `Unknown top-level field '${key}' is preserved but ignored for authority`));
    }
  }

  if (manifest.schema !== EXTENSION_SCHEMA_V0) diagnostics.push(diag("error", "schema_unsupported", "schema", `schema must equal '${EXTENSION_SCHEMA_V0}'`));
  if (typeof manifest.id !== "string" || !ID_RE.test(manifest.id)) diagnostics.push(diag("error", "id_invalid", "id", "id must match ^[a-z0-9][a-z0-9-]*$"));
  if (typeof manifest.name !== "string" || manifest.name.trim() === "") diagnostics.push(diag("error", "name_invalid", "name", "name must be a non-empty string"));
  if (!isValidSemver(manifest.version)) diagnostics.push(diag("error", "version_invalid", "version", "version must be valid SemVer"));

  if (checkObjectShape(manifest.compatibility, "compatibility", new Set(["totem", "sdk"]), diagnostics)) {
    for (const key of ["totem", "sdk"]) {
      if (!isValidSemverRange(manifest.compatibility[key])) diagnostics.push(diag("error", "compatibility_invalid", `compatibility.${key}`, `${key} must be a supported non-empty SemVer range`));
    }
  }

  if (manifest.enabledByDefault !== undefined && typeof manifest.enabledByDefault !== "boolean") diagnostics.push(diag("error", "shape_invalid", "enabledByDefault", "enabledByDefault must be boolean"));

  if (manifest.entrypoints !== undefined && checkObjectShape(manifest.entrypoints, "entrypoints", new Set(["backend"]), diagnostics)) {
    const backend = manifest.entrypoints.backend;
    if (backend !== undefined) {
      const invalid = typeof backend !== "string" || backend.trim() === "" || backend.startsWith("/") || /^[A-Za-z]:[\\/]/.test(backend) || backend.replace(/\\/g, "/").split("/").includes("..");
      if (invalid) diagnostics.push(diag("error", "entrypoint_invalid", "entrypoints.backend", "backend must be a package-local relative path that does not escape the package root"));
    }
  }

  if (manifest.lifecycle !== undefined && checkObjectShape(manifest.lifecycle, "lifecycle", new Set(["start"]), diagnostics)) {
    if (manifest.lifecycle.start !== undefined && !["on-enable", "on-demand"].includes(manifest.lifecycle.start)) diagnostics.push(diag("error", "lifecycle_invalid", "lifecycle.start", "start must be on-enable or on-demand"));
  }

  validateStringList(manifest.permissions, "permissions", diagnostics, isKnownPermission, "permission_unknown");

  if (manifest.events !== undefined && checkObjectShape(manifest.events, "events", new Set(["publish", "subscribe"]), diagnostics)) {
    const publish = validateStringList(manifest.events.publish, "events.publish", diagnostics, (value) => EVENT_RE.test(value), "event_type_invalid");
    validateStringList(manifest.events.subscribe, "events.subscribe", diagnostics, (value) => EVENT_RE.test(value) && value !== "*", "event_type_invalid");
    if (typeof manifest.id === "string" && ID_RE.test(manifest.id)) {
      const ownedPrefix = `extension.${manifest.id}.`;
      for (const event of publish) {
        if (!event.startsWith(ownedPrefix)) diagnostics.push(diag("error", "event_namespace_forbidden", "events.publish", `Extension '${manifest.id}' may only publish inside '${ownedPrefix}*'`));
      }
    }
  }

  if (manifest.secrets !== undefined) {
    if (!Array.isArray(manifest.secrets)) diagnostics.push(diag("error", "shape_invalid", "secrets", "secrets must be an array"));
    else manifest.secrets.forEach((secret, index) => {
      if (!secret || typeof secret !== "object" || Array.isArray(secret) || !ID_RE.test(secret.id || "") || (secret.required !== undefined && typeof secret.required !== "boolean")) diagnostics.push(diag("error", "secret_invalid", `secrets[${index}]`, "secret requires a valid id and optional boolean required"));
    });
  }

  const runtime = options.runtimeVersions;
  if (runtime && manifest.compatibility && typeof manifest.compatibility === "object") {
    for (const key of ["totem", "sdk"]) {
      if (runtime[key] && isValidSemverRange(manifest.compatibility[key]) && !satisfiesSemverRange(runtime[key], manifest.compatibility[key])) diagnostics.push(diag("error", "compatibility_unsatisfied", `compatibility.${key}`, `Runtime ${key} ${runtime[key]} does not satisfy ${manifest.compatibility[key]}`));
    }
  }

  return { ok: !diagnostics.some((item) => item.severity === "error"), manifest, diagnostics };
}

export function defineManifest(manifest) {
  return manifest;
}

export function assertValidManifest(input, options = {}) {
  const result = validateManifest(input, options);
  if (!result.ok) {
    const error = new Error(result.diagnostics.filter((item) => item.severity === "error").map((item) => `${item.code}@${item.path}: ${item.message}`).join("\n"));
    error.name = "ExtensionManifestValidationError";
    error.diagnostics = result.diagnostics;
    throw error;
  }
  return result.manifest;
}
