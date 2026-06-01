# Codex Subagent Orchestration Demand

Public issue cluster: Subagent Support and Subagent configuration and orchestration.

## Official Subagent Support

- Users request official subagent functionality in Codex instead of prompt-only or headless CLI workarounds.
- The requested system includes an agent registry, persistent agent storage, TUI integration for agent creation, prompt templating for agent definitions, and an agent selection interface.
- Expected subagent benefits include specialized expertise, context isolation, workflow optimization, separate concerns, focused conversations, and less context switching.
- Suggested agent archetypes include `code-reviewer`, `architect`, `debugger`, `documentation`, and `test-writer`.
- Users ask for `/agents`, agent creation workflow, agent switching within conversations, visual indicators for the active agent, and clear boundaries between subagent capabilities.

## Per-Agent Configuration

- Users want subagent configuration and orchestration so each helper can use a different model, `reasoning_effort`, permission profile, and MCP tool set.
- A common desired split is a strong planner/orchestrator model with faster explorer or implementation subagents such as Spark for scoped tasks.
- The current pain point is being stuck with one global model or reasoning configuration for the entire run, which sacrifices planning quality, speed, or cost.
- Requested config surfaces include `~/.codex/config.toml`, `agents_config.toml`, and repo-level files such as `.agents/subagents/explore_agent.md`.
- Users ask whether subagent instruction files append to or override `AGENTS.md`, whether repo-level overrides beat user-level defaults, and whether subagents can have opt-in MCP tools instead of all tools.
- They also want `/agents -> list`, `/agents -> config`, enabling/disabling specific subagents, custom role examples, and `agent_type` selection for planner, explorer, implementer, and reviewer roles.

## Workaround Evidence

- Some users run headless subagents with `codex --yolo exec "prompt"` and parallel shell jobs, but that needs manual timeout handling, shell escaping, log inspection, and cost tracking.
- Reports should distinguish official subagent support from fragile workarounds that spawn separate Codex processes.

## Evidence Checklist

- Codex app/CLI/TUI version, surface, model, reasoning effort, and whether `/agents`, `spawn_agent`, or `agent_type` is available.
- Desired role definitions and archetypes: planner, explorer, implementer, reviewer, debugger, architect, documentation, or test writer.
- Per-agent model/reasoning/speed needs and why one global config fails.
- Config shape: `~/.codex/config.toml`, `agents_config.toml`, `.agents/subagents/*.md`, repo-level overrides, user-level defaults, and instruction-file behavior versus `AGENTS.md`.
- Permission, sandbox, `read_only`, and MCP allowlist/denylist expectations per subagent.
- Context-isolation requirements, parent/child context sharing, and whether subagent prompts augment or replace base instructions.
- Workaround details such as `codex --yolo exec`, timeout, background jobs, logs, escaped shell prompt, and whether each subagent completed.
