export type ExtensionPermissionV0 =
  | "network.internet"
  | "network.local"
  | "filesystem.read"
  | "filesystem.write"
  | "shell.user"
  | "system.service"
  | "system.package_install"
  | "system.root"
  | "display.present"
  | "audio.play"
  | "mcp.register"
  | "agent.tools.register"
  | "tasks.create"
  | "tasks.interrupt"
  | `secrets.read:${string}`;

export interface ExtensionContributionV0 {
  id: string;
  title?: string;
  [key: string]: unknown;
}

export interface ExtensionContributionsV0 {
  display?: ExtensionContributionV0[];
  dashboard?: ExtensionContributionV0[];
  [key: string]: unknown;
}

/**
 * Optional read-only presentation hook exposed by a backend instance.
 * Core owns rendering and lifecycle cleanup; returned data must be structured-
 * cloneable and must not contain secret values.
 */
export interface ExtensionBackendInstanceV0 {
  start?: () => unknown | Promise<unknown>;
  stop?: () => unknown | Promise<unknown>;
  contributionSnapshot?: () => unknown | Promise<unknown>;
}

export interface ExtensionManifestV0 {
  schema: "totem.extension/v0";
  id: string;
  name: string;
  version: string;
  compatibility: { totem: string; sdk: string };
  enabledByDefault?: boolean;
  entrypoints?: { backend?: string };
  lifecycle?: { start?: "on-enable" | "on-demand" };
  permissions?: ExtensionPermissionV0[];
  events?: { publish?: string[]; subscribe?: string[] };
  contributions?: ExtensionContributionsV0;
  settings?: Record<string, unknown>;
  secrets?: Array<{ id: string; required?: boolean }>;
  mcp?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ManifestDiagnostic {
  severity: "warning" | "error";
  code: string;
  path: string;
  message: string;
}

export interface ManifestValidationResult {
  ok: boolean;
  manifest: ExtensionManifestV0 | Record<string, unknown> | null;
  diagnostics: ManifestDiagnostic[];
}

export const EXTENSION_SCHEMA_V0: "totem.extension/v0";
export const SDK_VERSION: string;
export const BASE_PERMISSIONS: readonly string[];

export function defineManifest<T extends ExtensionManifestV0>(manifest: T): T;
export function isValidSemver(value: unknown): boolean;
export function isValidSemverRange(value: unknown): boolean;
export function satisfiesSemverRange(version: string, range: string): boolean;
export function isKnownPermission(permission: unknown): boolean;
export function validateManifest(
  input: string | Record<string, unknown>,
  options?: { runtimeVersions?: { totem?: string; sdk?: string } },
): ManifestValidationResult;
export function assertValidManifest(
  input: string | Record<string, unknown>,
  options?: { runtimeVersions?: { totem?: string; sdk?: string } },
): ExtensionManifestV0 | Record<string, unknown>;
