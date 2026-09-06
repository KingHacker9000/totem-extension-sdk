import test from "node:test";
import assert from "node:assert/strict";
import {
  assertValidManifest,
  satisfiesSemverRange,
  validateManifest,
} from "../src/index.js";

const valid = {
  schema: "totem.extension/v0",
  id: "weather",
  name: "Weather",
  version: "0.2.0",
  compatibility: { totem: ">=0.2.0 <0.3.0", sdk: ">=0.2.0 <0.3.0" },
  enabledByDefault: true,
  entrypoints: { backend: "./backend/index.js" },
  lifecycle: { start: "on-enable" },
  permissions: ["network.internet", "display.present", "secrets.read:weather-api"],
  events: {
    publish: ["extension.weather.updated"],
    subscribe: ["core.status"],
  },
};

test("accepts a valid v0 manifest and runtime compatibility", () => {
  const result = validateManifest(valid, { runtimeVersions: { totem: "0.2.4", sdk: "0.2.0" } });
  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
  assert.equal(assertValidManifest(valid).id, "weather");
});

test("rejects unknown permissions, wildcard secret access, and duplicate permissions", () => {
  const result = validateManifest({ ...valid, permissions: ["network", "secrets.read:*", "display.present", "display.present"] });
  assert.equal(result.ok, false);
  assert(result.diagnostics.some((d) => d.code === "permission_unknown"));
  assert(result.diagnostics.some((d) => d.code === "permission_duplicate"));
});

test("rejects package-root escapes and forged core events", () => {
  const result = validateManifest({
    ...valid,
    entrypoints: { backend: "../../outside.js" },
    events: { publish: ["task.succeeded"] },
  });
  assert.equal(result.ok, false);
  assert(result.diagnostics.some((d) => d.code === "entrypoint_invalid"));
  assert(result.diagnostics.some((d) => d.code === "event_namespace_forbidden"));
});

test("flags Phase 1 fields without granting authority", () => {
  const result = validateManifest({ ...valid, capabilities: ["network"], entrypoint: "index.js" });
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.filter((d) => d.code === "phase1_stub_manifest").length, 2);
});

test("checks exact/comparator/caret/tilde ranges", () => {
  assert.equal(satisfiesSemverRange("0.2.4", ">=0.2.0 <0.3.0"), true);
  assert.equal(satisfiesSemverRange("0.3.0", ">=0.2.0 <0.3.0"), false);
  assert.equal(satisfiesSemverRange("2.4.0", "^2.1.0"), true);
  assert.equal(satisfiesSemverRange("3.0.0", "^2.1.0"), false);
  assert.equal(satisfiesSemverRange("1.4.9", "~1.4.2"), true);
  assert.equal(satisfiesSemverRange("1.5.0", "~1.4.2"), false);
});

test("reports unsatisfied Totem/SDK compatibility", () => {
  const result = validateManifest(valid, { runtimeVersions: { totem: "0.3.0", sdk: "0.2.0" } });
  assert.equal(result.ok, false);
  assert(result.diagnostics.some((d) => d.code === "compatibility_unsatisfied" && d.path === "compatibility.totem"));
});
