# OpenAI OSS Brief

| Field | Value |
| --- | --- |
| Repository | https://github.com/grnbtqdbyx-create/trace-to-skill |
| Package | trace-to-skill@0.1.101 |
| License | Apache-2.0 |
| Codex readiness | ready (100/100) |
| Benchmark | pass, 46 cases |

## Why This Repository Qualifies

trace-to-skill helps open-source maintainers adopt Codex safely by turning failed coding-agent runs into evidence-backed rules, reusable workflows, CI gates, and a weekly Codex Issue Radar for live GitHub issue demand. It supports real maintenance work: PR review, issue triage, release quality, MCP risk, prompt-injection defense, privacy-preserving trace sharing, and repeat failure reduction. The repository is ready, scores 100/100 on the local Codex readiness doctor, and ships a deterministic benchmark with 46 public fixture cases.

### 500-Character Version

> trace-to-skill helps open-source maintainers adopt Codex safely by turning failed coding-agent runs into evidence-backed rules, reusable workflows, CI gates, and a weekly Codex Issue Radar for live GitHub issue demand. It supports real maintenance work: PR review, issue triage, release quality, MCP risk, prompt-injection defense, privacy-preserving trace sharing, and repeat failure reduction. The repository is ready, scores 100/100 on the local Codex readiness doctor...

## How API Credits Would Be Used

API credits would power optional maintainer workflows on top of the local deterministic scanner: classifying failed Codex sessions, mining public GitHub issue clusters, generating candidate AGENTS.md rules or SKILL.md workflows, comparing before/after runs, and producing PR-ready triage reports. The local CLI remains free, dependency-light, and usable without API credits.

### 500-Character Version

> API credits would power optional maintainer workflows on top of the local deterministic scanner: classifying failed Codex sessions, mining public GitHub issue clusters, generating candidate AGENTS.md rules or SKILL.md workflows, comparing before/after runs, and producing PR-ready triage reports. The local CLI remains free, dependency-light, and usable without API credits.

## Evidence

- Public repository: https://github.com/grnbtqdbyx-create/trace-to-skill
- One-command package: npx trace-to-skill@0.1.101
- Open-source license: Apache-2.0
- Codex readiness doctor: ready, 100/100, 0 failed checks.
- Public fixture benchmark: pass, 46 cases.
- GitHub issue demand mining: issue-map fetches or reads piped GitHub CLI issue JSON, then ranks OpenAI/Codex issues by failure class, comments, reactions, evidence gaps, and Maintainer Roadmap next artifacts.
- Weekly Codex Issue Radar: init --issue-map-repo owner/name scaffolds a scheduled Action that fetches live GitHub issues and publishes the pain map to the job summary or a stable tracking issue comment.
- Maintainer control: generated rules are suggestions, evidence is line-linked, and secrets can be redacted before sharing.

## Next Steps Before Submitting

- Add current GitHub stars, npm monthly downloads, downstream users, or adoption examples before submitting the application.
- Link the latest release, CI run, readiness report, and benchmark report as public proof.
- Describe your maintainer role and the recurring PR review, issue triage, release, or security workload this project reduces.

Run it locally:

```bash
trace-to-skill oss-brief .
trace-to-skill oss-brief . --format json
```
