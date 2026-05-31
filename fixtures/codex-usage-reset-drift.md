# Codex Usage Reset Schedule Drift

Source clusters:
- https://github.com/openai/codex/issues/9508
- https://github.com/openai/codex/issues/5999

Observed environments:
- Codex CLI v0.87.0 on macOS, Pro account, gpt-5.2-codex.
- Codex CLI v0.50.0 on Darwin arm64, Team account, gpt-5-codex-medium.

Symptoms:
- `/status` showed the weekly limit reset due on Nov 3, but the next day it showed Nov 7.
- The weekly reset date changed from Nov 3 to Nov 7 without a matching increase in usable allowance.
- Weekly reset time should be scheduled and deterministic, not based on the first prompt after the blackout period.
- Users saved 20%, 28%, 50%, 60%, or 70% weekly usage for later work, then an unexpected reset caused saved capacity to be lost or pushed into the next week's allowance.
- A reset happened 14 hours ahead of the time shown by `/status`, so work consumed the newly reset weekly allowance instead of the prior window.
- Some reports say the 7d reset timestamp flips between multiple inconsistent values during polling.
- Reports ask OpenAI to decouple usage amount from reset date, preserve unused prior-window capacity, or add bonus capacity without moving the reset anchor.
- Users want an about-to-happen-reset warning, deterministic reset schedule, stable 7-day window, or opt-out when outage compensation resets would hurt planned usage.
- Some comments compare the reset behavior against a stable same-day weekly reset and describe the current behavior as not transparent billing.

Example timeline:

```text
2026-05-12 09:00 /status: weekly 50% remaining, resets May 14.
2026-05-12 13:00 dashboard: weekly reset happened today, new reset date May 19.
2026-05-12 18:00 /status: 36% weekly remaining, 5h limit exhausted.
```

Diagnostics to capture:
- Subscription plan, workspace, and whether the account is Plus, Pro, Team, or Enterprise.
- Codex app/CLI version, model, reasoning effort, and speed mode.
- Exact `/status` output before and after the reset with timezone.
- Usage dashboard screenshots or exported timestamps for 5h, daily, and weekly percentages.
- Previous and new reset_at values, plus whether the value changed only in display or actual enforcement.
- Whether a prompt or background job was running during the reset.
- Whether OpenAI announced a global reset, outage compensation, or changelog entry at the same time.
- Whether unused prior-window capacity was preserved, rolled over, wiped, or consumed by in-flight work.
