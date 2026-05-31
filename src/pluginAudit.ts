import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export type PluginAuditStatus = "pass" | "warn" | "fail";
export type PluginAuditSeverity = "warning" | "error";

export interface PluginAuditOptions {
  appPath?: string;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  homeDir?: string;
}

export interface PluginAuditPlugin {
  id: string;
  name: string;
  marketplace: string;
  configured: boolean;
  enabled: boolean;
  cachePath?: string;
  cachePresent: boolean;
  manifestPaths: string[];
}

export interface PluginAuditMarketplace {
  type: "app-bundle" | "runtime";
  marketplace: string;
  path: string;
  plugins: string[];
}

export interface PluginAuditHelperApp {
  name: "computer-use";
  required: boolean;
  installed: boolean;
  candidates: string[];
}

export interface PluginAuditFinding {
  severity: PluginAuditSeverity;
  kind:
    | "codex_home_env_mismatch"
    | "unsupported_feature_flag"
    | "enabled_plugin_cache_missing"
    | "plugin_manifest_missing"
    | "runtime_marketplace_missing"
    | "bundled_marketplace_mismatch"
    | "computer_use_helper_missing";
  message: string;
  path?: string;
}

export interface PluginAuditResult {
  generatedAt: string;
  target: string;
  appPath?: string;
  status: PluginAuditStatus;
  environment: {
    platform: NodeJS.Platform;
    codexHomeEnv?: string;
  };
  summary: {
    configuredPlugins: number;
    enabledPlugins: number;
    cachePlugins: number;
    pluginsMissingCache: number;
    pluginsMissingManifest: number;
    appBundleMarketplaces: number;
    runtimeMarketplaces: number;
    helperApps: number;
  };
  plugins: PluginAuditPlugin[];
  marketplaces: PluginAuditMarketplace[];
  helperApps: PluginAuditHelperApp[];
  findings: PluginAuditFinding[];
}

interface ConfigPlugin {
  id: string;
  name: string;
  marketplace: string;
  enabled: boolean;
}

const SUPPORTED_FEATURE_FLAGS = new Set([
  "apps",
  "hooks",
  "memories",
  "plugins",
  "remote_control",
  "tool_search",
  "tool_suggest",
  "tool_call_mcp_elicitation"
]);

const MANIFEST_NAMES = new Set(["plugin.json", ".mcp.json"]);

export async function auditCodexPlugins(target = "~/.codex", options: PluginAuditOptions = {}): Promise<PluginAuditResult> {
  const homeDir = options.homeDir ?? os.homedir();
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const resolvedTarget = path.resolve(expandHome(target, homeDir));
  const resolvedAppPath = options.appPath ? path.resolve(expandHome(options.appPath, homeDir)) : undefined;
  const configuredPlugins = await readConfiguredPlugins(path.join(resolvedTarget, "config.toml"));
  const cachePlugins = await discoverCachePlugins(resolvedTarget, configuredPlugins);
  const marketplaces = [
    ...(resolvedAppPath ? await discoverAppMarketplaces(resolvedAppPath) : []),
    ...await discoverRuntimeMarketplaces(resolvedTarget)
  ];
  const helperApps = await discoverHelperApps(cachePlugins, marketplaces, { platform, appPath: resolvedAppPath, homeDir });
  const findings = await buildFindings({
    target: resolvedTarget,
    appPath: resolvedAppPath,
    env,
    platform,
    configuredPlugins,
    plugins: cachePlugins,
    marketplaces,
    helperApps
  });

  return {
    generatedAt: new Date().toISOString(),
    target: resolvedTarget,
    appPath: resolvedAppPath,
    status: statusFor(findings),
    environment: {
      platform,
      codexHomeEnv: env.CODEX_HOME
    },
    summary: {
      configuredPlugins: configuredPlugins.length,
      enabledPlugins: configuredPlugins.filter((plugin) => plugin.enabled).length,
      cachePlugins: cachePlugins.filter((plugin) => plugin.cachePresent).length,
      pluginsMissingCache: cachePlugins.filter((plugin) => plugin.enabled && !plugin.cachePresent).length,
      pluginsMissingManifest: cachePlugins.filter((plugin) => plugin.cachePresent && plugin.manifestPaths.length === 0).length,
      appBundleMarketplaces: marketplaces.filter((marketplace) => marketplace.type === "app-bundle").length,
      runtimeMarketplaces: marketplaces.filter((marketplace) => marketplace.type === "runtime").length,
      helperApps: helperApps.length
    },
    plugins: cachePlugins,
    marketplaces,
    helperApps,
    findings
  };
}

export function renderPluginAuditMarkdown(result: PluginAuditResult): string {
  const lines = [
    "# trace-to-skill Codex Plugin Audit",
    "",
    `Status: **${result.status}**`,
    "",
    `Target: \`${result.target}\``,
    `App bundle: ${result.appPath ? `\`${result.appPath}\`` : "not provided"}`,
    `Platform: \`${result.environment.platform}\``,
    `CODEX_HOME env: ${result.environment.codexHomeEnv ? `\`${result.environment.codexHomeEnv}\`` : "not set"}`,
    "",
    "## Summary",
    "",
    `- configured plugins: ${result.summary.configuredPlugins}`,
    `- enabled plugins: ${result.summary.enabledPlugins}`,
    `- cache plugins: ${result.summary.cachePlugins}`,
    `- missing cache: ${result.summary.pluginsMissingCache}`,
    `- missing manifest: ${result.summary.pluginsMissingManifest}`,
    `- app bundle marketplaces: ${result.summary.appBundleMarketplaces}`,
    `- runtime marketplaces: ${result.summary.runtimeMarketplaces}`,
    "",
    "## Findings",
    ""
  ];

  if (result.findings.length === 0) {
    lines.push("No Codex plugin findings detected.", "");
  } else {
    for (const finding of result.findings) {
      const location = finding.path ? ` \`${finding.path}\`` : "";
      lines.push(`- **${finding.severity}** ${finding.kind}${location}: ${finding.message}`);
    }
    lines.push("");
  }

  lines.push("## Plugins", "");
  if (result.plugins.length === 0) {
    lines.push("No configured or cached plugins found.", "");
  } else {
    lines.push("| Plugin | Enabled | Cache | Manifests |");
    lines.push("| --- | ---: | --- | --- |");
    for (const plugin of result.plugins) {
      lines.push(`| \`${plugin.id}\` | ${plugin.enabled ? "yes" : "no"} | ${plugin.cachePresent ? `\`${plugin.cachePath ?? ""}\`` : "missing"} | ${plugin.manifestPaths.length > 0 ? plugin.manifestPaths.map((item) => `\`${item}\``).join(", ") : "none"} |`);
    }
    lines.push("");
  }

  lines.push("## Marketplaces", "");
  if (result.marketplaces.length === 0) {
    lines.push("No bundled runtime or app marketplaces found.", "");
  } else {
    for (const marketplace of result.marketplaces) {
      lines.push(`- ${marketplace.type} \`${marketplace.marketplace}\`: ${marketplace.plugins.length} plugin(s) at \`${marketplace.path}\``);
    }
    lines.push("");
  }

  lines.push(
    "Suggested next step:",
    "",
    "- Attach this report to Codex Browser, Computer Use, Chrome, bundled plugin, or MCP runtime issues instead of publishing raw logs or full config.",
    "- If `CODEX_HOME` points somewhere else, run the audit on that home too before deleting or resetting local Codex state.",
    ""
  );

  return lines.join("\n");
}

async function readConfiguredPlugins(configPath: string): Promise<ConfigPlugin[]> {
  let content = "";
  try {
    content = await fs.readFile(configPath, "utf8");
  } catch {
    return [];
  }

  const plugins: ConfigPlugin[] = [];
  const lines = content.split(/\r?\n/);
  let currentPlugin: ConfigPlugin | undefined;

  for (const rawLine of lines) {
    const line = stripTomlComment(rawLine).trim();
    const section = /^\[plugins\.((?:"[^"]+"|'[^']+'|[^\]]+))\]$/.exec(line);
    if (section) {
      const id = unquoteTomlPart(section[1]);
      const [name, marketplace] = parsePluginId(id);
      currentPlugin = { id, name, marketplace, enabled: false };
      plugins.push(currentPlugin);
      continue;
    }

    if (currentPlugin && /^enabled\s*=\s*true\b/.test(line)) {
      currentPlugin.enabled = true;
    }
  }

  return plugins;
}

async function discoverCachePlugins(root: string, configuredPlugins: ConfigPlugin[]): Promise<PluginAuditPlugin[]> {
  const byId = new Map<string, PluginAuditPlugin>();

  for (const configured of configuredPlugins) {
    const cachePath = path.join(root, "plugins", "cache", configured.marketplace, configured.name);
    byId.set(configured.id, {
      ...configured,
      configured: true,
      cachePath,
      cachePresent: await pathExists(cachePath),
      manifestPaths: await findManifestPaths(cachePath, root)
    });
  }

  const cacheRoot = path.join(root, "plugins", "cache");
  try {
    for (const marketplaceEntry of await fs.readdir(cacheRoot, { withFileTypes: true })) {
      if (!marketplaceEntry.isDirectory()) {
        continue;
      }
      const marketplacePath = path.join(cacheRoot, marketplaceEntry.name);
      for (const pluginEntry of await fs.readdir(marketplacePath, { withFileTypes: true })) {
        if (!pluginEntry.isDirectory()) {
          continue;
        }
        const id = `${pluginEntry.name}@${marketplaceEntry.name}`;
        if (byId.has(id)) {
          continue;
        }
        const cachePath = path.join(marketplacePath, pluginEntry.name);
        byId.set(id, {
          id,
          name: pluginEntry.name,
          marketplace: marketplaceEntry.name,
          configured: false,
          enabled: false,
          cachePath,
          cachePresent: true,
          manifestPaths: await findManifestPaths(cachePath, root)
        });
      }
    }
  } catch {
    // Missing plugin cache is reported through configured plugin findings.
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

async function discoverAppMarketplaces(appPath: string): Promise<PluginAuditMarketplace[]> {
  return discoverMarketplacesUnder(
    path.join(appPath, "Contents", "Resources", "plugins"),
    "app-bundle",
    appPath
  );
}

async function discoverRuntimeMarketplaces(root: string): Promise<PluginAuditMarketplace[]> {
  const candidates = [
    path.join(root, ".tmp", "bundled-marketplaces"),
    path.join(root, "plugins", "cache")
  ];
  const results: PluginAuditMarketplace[] = [];
  for (const candidate of candidates) {
    results.push(...await discoverMarketplacesUnder(candidate, "runtime", root));
  }
  return results;
}

async function discoverMarketplacesUnder(root: string, type: PluginAuditMarketplace["type"], relativeRoot: string): Promise<PluginAuditMarketplace[]> {
  const results: PluginAuditMarketplace[] = [];

  async function walk(directory: string, depth: number): Promise<void> {
    if (depth > 5) {
      return;
    }

    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
        continue;
      }

      if (entry.isFile() && entry.name === "marketplace.json" && fullPath.includes(`${path.sep}.agents${path.sep}plugins${path.sep}`)) {
        const plugins = await readMarketplacePlugins(fullPath);
        results.push({
          type,
          marketplace: marketplaceNameFor(fullPath, root),
          path: path.relative(relativeRoot, fullPath) || path.basename(fullPath),
          plugins
        });
      }
    }
  }

  await walk(root, 0);
  return results.sort((a, b) => a.path.localeCompare(b.path));
}

async function discoverHelperApps(
  plugins: PluginAuditPlugin[],
  marketplaces: PluginAuditMarketplace[],
  context: { platform: NodeJS.Platform; appPath?: string; homeDir: string }
): Promise<PluginAuditHelperApp[]> {
  const hasComputerUse = plugins.some((plugin) => plugin.name === "computer-use" && (plugin.enabled || plugin.cachePresent)) ||
    marketplaces.some((marketplace) => marketplace.plugins.includes("computer-use"));
  if (!hasComputerUse || context.platform !== "darwin") {
    return [];
  }

  const candidates = [
    path.join(context.homeDir, "Applications", "Codex Computer Use.app"),
    "/Applications/Codex Computer Use.app"
  ];
  if (context.appPath) {
    candidates.push(path.join(context.appPath, "Contents", "Resources", "plugins", "openai-bundled", "plugins", "computer-use", "Codex Computer Use.app"));
  }

  const installed = (await Promise.all(candidates.map(pathExists))).some(Boolean);
  return [{
    name: "computer-use",
    required: true,
    installed,
    candidates
  }];
}

async function buildFindings(context: {
  target: string;
  appPath?: string;
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  configuredPlugins: ConfigPlugin[];
  plugins: PluginAuditPlugin[];
  marketplaces: PluginAuditMarketplace[];
  helperApps: PluginAuditHelperApp[];
}): Promise<PluginAuditFinding[]> {
  const findings: PluginAuditFinding[] = [];

  if (context.env.CODEX_HOME && path.resolve(expandHome(context.env.CODEX_HOME, os.homedir())) !== context.target) {
    findings.push({
      severity: "warning",
      kind: "codex_home_env_mismatch",
      message: `CODEX_HOME points to ${context.env.CODEX_HOME}, but this audit target is ${context.target}.`
    });
  }

  findings.push(...await unsupportedFeatureFindings(path.join(context.target, "config.toml")));

  for (const plugin of context.plugins.filter((item) => item.enabled)) {
    if (!plugin.cachePresent) {
      findings.push({
        severity: "warning",
        kind: "enabled_plugin_cache_missing",
        path: plugin.cachePath,
        message: `enabled plugin "${plugin.id}" has no cache directory.`
      });
      continue;
    }

    if (plugin.manifestPaths.length === 0) {
      findings.push({
        severity: "warning",
        kind: "plugin_manifest_missing",
        path: plugin.cachePath,
        message: `plugin cache for "${plugin.id}" exists but no plugin.json or .mcp.json manifest was found.`
      });
    }
  }

  const runtimeByMarketplace = new Map<string, Set<string>>();
  for (const runtime of context.marketplaces.filter((item) => item.type === "runtime")) {
    const existing = runtimeByMarketplace.get(runtime.marketplace) ?? new Set<string>();
    runtime.plugins.forEach((plugin) => existing.add(plugin));
    runtimeByMarketplace.set(runtime.marketplace, existing);
  }

  for (const appMarketplace of context.marketplaces.filter((item) => item.type === "app-bundle")) {
    const runtimePlugins = runtimeByMarketplace.get(appMarketplace.marketplace);
    if (!runtimePlugins) {
      findings.push({
        severity: "warning",
        kind: "runtime_marketplace_missing",
        path: appMarketplace.path,
        message: `app bundle marketplace "${appMarketplace.marketplace}" has no generated runtime marketplace under the Codex home.`
      });
      continue;
    }

    const missing = appMarketplace.plugins.filter((plugin) => !runtimePlugins.has(plugin));
    if (missing.length > 0) {
      findings.push({
        severity: "warning",
        kind: "bundled_marketplace_mismatch",
        path: appMarketplace.path,
        message: `app bundle marketplace lists plugin(s) missing from generated runtime marketplace: ${missing.join(", ")}.`
      });
    }
  }

  for (const helper of context.helperApps.filter((item) => item.required && !item.installed)) {
    findings.push({
      severity: "warning",
      kind: "computer_use_helper_missing",
      message: `Computer Use appears configured or bundled, but no Codex Computer Use helper app was found at expected install locations.`
    });
  }

  return findings;
}

async function unsupportedFeatureFindings(configPath: string): Promise<PluginAuditFinding[]> {
  let content = "";
  try {
    content = await fs.readFile(configPath, "utf8");
  } catch {
    return [];
  }

  const findings: PluginAuditFinding[] = [];
  let inFeatures = false;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = stripTomlComment(rawLine).trim();
    const section = /^\[([^\]]+)\]$/.exec(line);
    if (section) {
      inFeatures = section[1] === "features";
      continue;
    }
    if (!inFeatures) {
      continue;
    }
    const assignment = /^([A-Za-z0-9_-]+)\s*=\s*true\b/.exec(line);
    if (assignment && !SUPPORTED_FEATURE_FLAGS.has(assignment[1])) {
      findings.push({
        severity: "warning",
        kind: "unsupported_feature_flag",
        path: configPath,
        message: `[features].${assignment[1]} is enabled, but it is not in the known supported Codex feature list.`
      });
    }
  }
  return findings;
}

async function findManifestPaths(root: string, relativeRoot: string): Promise<string[]> {
  const results: string[] = [];
  if (!(await pathExists(root))) {
    return results;
  }

  async function walk(directory: string, depth: number): Promise<void> {
    if (depth > 4) {
      return;
    }

    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
        continue;
      }
      if (entry.isFile() && MANIFEST_NAMES.has(entry.name)) {
        results.push(path.relative(relativeRoot, fullPath) || path.basename(fullPath));
      }
    }
  }

  await walk(root, 0);
  return results.sort();
}

async function readMarketplacePlugins(marketplacePath: string): Promise<string[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(marketplacePath, "utf8")) as unknown;
    const object = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
    const rawPlugins = Array.isArray(object.plugins) ? object.plugins : [];
    return rawPlugins.flatMap((plugin) => {
      if (typeof plugin === "string") {
        return [plugin];
      }
      if (plugin && typeof plugin === "object") {
        const item = plugin as Record<string, unknown>;
        const name = item.name ?? item.id ?? item.package;
        return typeof name === "string" ? [name] : [];
      }
      return [];
    }).sort();
  } catch {
    return [];
  }
}

function marketplaceNameFor(marketplacePath: string, root: string): string {
  const relative = path.relative(root, marketplacePath);
  const first = relative.split(path.sep)[0];
  return first || "unknown";
}

function parsePluginId(id: string): [string, string] {
  const separator = id.lastIndexOf("@");
  if (separator <= 0 || separator === id.length - 1) {
    return [id, "unknown"];
  }
  return [id.slice(0, separator), id.slice(separator + 1)];
}

function statusFor(findings: PluginAuditFinding[]): PluginAuditStatus {
  if (findings.some((finding) => finding.severity === "error")) {
    return "fail";
  }
  return findings.length > 0 ? "warn" : "pass";
}

function stripTomlComment(line: string): string {
  let quote: "\"" | "'" | undefined;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const previous = line[index - 1];
    if ((char === "\"" || char === "'") && previous !== "\\") {
      quote = quote === char ? undefined : quote ?? char;
      continue;
    }
    if (char === "#" && !quote) {
      return line.slice(0, index);
    }
  }
  return line;
}

function unquoteTomlPart(value: string): string {
  if (value.startsWith("\"")) {
    const match = /^"((?:\\.|[^"\\])*)"/.exec(value);
    return match ? match[1].replace(/\\"/g, "\"").replace(/\\\\/g, "\\") : value;
  }
  if (value.startsWith("'")) {
    const match = /^'([^']*)'/.exec(value);
    return match ? match[1] : value;
  }
  return value;
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
}

function expandHome(input: string, homeDir: string): string {
  if (input === "~") {
    return homeDir;
  }
  if (input.startsWith("~/")) {
    return path.join(homeDir, input.slice(2));
  }
  return input;
}
