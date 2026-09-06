# Totem Extension SDK

Public SDK and compatibility contract for building Totem extensions.

The first working SDK contract is `totem.extension/v0`, defined normatively by `KingHacker9000/totem/docs/EXTENSION_MANIFEST_V0.md`. This repository provides the public authoring types, manifest validator, compatibility checks, permission vocabulary helpers, and fixtures that extension authors use without importing Totem core internals.

## Install / consume

The package is intentionally zero-dependency for the v0 manifest layer and supports Node 22+.

```js
import {
  defineManifest,
  validateManifest,
  assertValidManifest,
} from "@totem/extension-sdk";

const manifest = defineManifest({
  schema: "totem.extension/v0",
  id: "hello-world",
  name: "Hello World",
  version: "0.2.0",
  compatibility: {
    totem: ">=0.2.0 <0.3.0",
    sdk: ">=0.2.0 <0.3.0",
  },
  permissions: [],
});

const result = validateManifest(manifest, {
  runtimeVersions: { totem: "0.2.0", sdk: "0.2.0" },
});

if (!result.ok) console.error(result.diagnostics);
assertValidManifest(manifest);
```

`defineManifest()` preserves TypeScript inference through the shipped declaration file. `validateManifest()` never throws for ordinary invalid input and returns stable diagnostics; `assertValidManifest()` is the strict convenience form.

## What v0 validates

- required identity and `totem.extension/v0` schema
- SemVer package version and supported compatibility ranges
- running Totem/SDK compatibility when runtime versions are supplied
- package-local backend entrypoints with root-escape rejection
- lifecycle start mode
- exact least-privilege permission vocabulary, including `secrets.read:<id>`
- duplicate/unknown permission rejection
- normalized event syntax and extension-owned publish namespace enforcement
- reserved secret declaration shape
- warning-only unknown top-level metadata
- targeted `phase1_stub_manifest` migration warnings for old `entrypoint` / `capabilities` fields
- rejection of unknown fields inside security-sensitive structures

Unknown top-level fields are preserved but never interpreted as authority.

## Contributions

The TypeScript API includes `ExtensionContributionV0`, `ExtensionContributionsV0`, and `ExtensionBackendInstanceV0`. A manifest may declare generic `dashboard` and `display` descriptors with package-local IDs/titles. Backends may expose the optional read-only hook:

```ts
contributionSnapshot(): unknown | Promise<unknown>
```

Totem core owns rendering. The snapshot must be structured-cloneable presentation data and must never contain secret values. Extensions do not inject arbitrary React, HTML, or JavaScript into host surfaces.

A display contribution does not grant display authority. Extensions that present on the device request `display.present`, and core exposes the display contribution only when that permission is effectively granted. Dashboard contribution metadata is rendered by the generic dashboard host and is removed when the extension is disabled or fails.

## Compatibility helpers

The SDK exports `isValidSemver`, `isValidSemverRange`, and `satisfiesSemverRange`. v0 intentionally supports the range forms used by the Totem contract and fixtures: exact versions, comparator chains such as `>=0.2.0 <0.3.0`, caret ranges, and tilde ranges.

## Hello-world fixture

`examples/hello-world/totem-extension.json` is a copyright-clean declarative fixture that validates through the same public `validateManifest()` API intended for third-party extensions. It requests no privileged permissions and publishes only inside `extension.hello-world.*`.

## Development

```bash
npm test
npm run check
```

The tests use Node's built-in test runner, so the manifest layer needs no install-time third-party dependencies.

## Architectural rules

- Extensions declare requested permissions; the manifest is never authority by itself.
- Totem core enforces effective grants at privileged boundaries.
- Extensions must not import private Totem core internals.
- Extensions may be declarative or MCP-only and therefore need no backend entrypoint.
- Service-specific logic belongs in extensions, not core.
- Themes are a separate SDK and cannot use extension permissions as a capability mechanism.
