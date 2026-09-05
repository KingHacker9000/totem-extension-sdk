# Totem Extension SDK

Public SDK and compatibility contract for building Totem extensions.

Extensions add **capabilities** to Totem: tools, MCP servers/connectors, background work, events, settings, secrets access, display views, dashboard views, and host/device integrations.

## Planned contents

- extension manifest schema
- generated TypeScript/Python types as needed
- permission/capability definitions
- event APIs
- display contribution APIs
- dashboard contribution APIs
- MCP registration helpers
- settings/secrets APIs
- lifecycle hooks
- testing/mocking utilities
- compatibility/version checks
- extension scaffolding CLI/templates
- developer documentation and fixtures

## Architectural rules

- Extensions must declare requested permissions.
- Extensions must not import private Totem core internals.
- Extensions may be MCP-only.
- Extension UI requests display presentation through Totem's display manager rather than taking direct ownership of the screen.
- Service-specific logic belongs in extensions, not the core.
- Themes are a separate SDK and must not be used as a capability mechanism.

## Phase 1 stub contract

The full public SDK is **not frozen yet**. During Phase 1, the main `KingHacker9000/totem` repository owns a deliberately minimal discovery contract in `docs/DISCOVERY.md` using the pre-v1 schema id `totem.extension/v0`.

That stub exists only to prove local discovery/validation, enablement, diagnostics, coarse capability declaration, and dashboard visibility. It is not the final permission model, registry contract, package format, compatibility promise, or SDK v1 manifest.

Implementations and examples in this repository should not treat Phase 1 stub details as permanent public API without an explicit later compatibility decision.

The first full working SDK contract will be established in a later software phase after the Phase 1 runtime seams have been exercised.

See the main architecture documentation in `KingHacker9000/totem`.
