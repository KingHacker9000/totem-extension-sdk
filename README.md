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

The manifest/API is not frozen during Phase 0. Phase 2 of the main Totem roadmap will establish the first working SDK contract.

See the main architecture documentation in `KingHacker9000/totem`.
