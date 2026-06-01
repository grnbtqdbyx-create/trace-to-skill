# Codex Usage Bucket Confusion

## Summary

Codex Desktop usage popover shows short-term and weekly buckets as compact percentages, but the scope and semantics are unclear.

## Evidence

- The in-app usage popover shows `Usage remaining`.
- The 5h row shows `5h 97% 6:23 PM`.
- The Weekly row shows `Weekly 95% Jun 7`.
- The user believes this is the first 5-hour usage window of the week, so `5h: 97% remaining` and `Weekly: 95% remaining` look contradictory.
- The popover does not say whether percentages are percent remaining or percent used.
- The popover does not say whether the weekly bucket is a natural week, rolling 7-day window, or account-wide pool.
- It is unclear whether weekly usage includes Codex Desktop, CLI, cloud tasks, reviews, other devices, or other workspaces.
- Without scope labels, the usage popover looks like a metering bug or contradictory quota display.

## Expected

The UI should label the accounting scope explicitly:

```text
Current 5h window: 97% remaining
Weekly pool: 95% remaining
Includes all Codex usage across app, CLI, cloud tasks, reviews, and devices
Resets Jun 7
```

If the weekly bucket is rolling rather than calendar-week based, the popover should say `Rolling 7-day window`.

## Diagnostics To Attach

Include subscription plan, account/workspace, app/CLI version, surface, timestamp, screenshot or redacted text of the popover, 5h percentage, weekly percentage, reset time/date, whether the percentages mean used or remaining, whether weekly is rolling or calendar-based, whether the weekly pool includes app/CLI/cloud/review usage, `/status` output, usage dashboard state, and whether other devices or workspaces show the same values.
