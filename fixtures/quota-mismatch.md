# Codex quota mismatch fixture

## Usage page and status disagree with runtime error

The usage dashboard and `/status` both showed quota remaining before the prompt:

```text
Account: user@example.com (Plus)
Model: gpt-5.3-codex
5h limit: 94% left (resets 13:26)
Weekly limit: 21% left (resets Feb 25th, 2026 8:07 PM)
Visit https://chatgpt.com/codex/settings/usage for up-to-date information on rate limits and credits
```

Immediately after sending `ping`, Codex returned:

```text
You've hit your usage limit. Visit https://chatgpt.com/codex/settings/usage to purchase more credits or try again at 1:36 PM.
```

After the failed prompt, `/status` flipped to `0%` weekly remaining.

## Account-scoping suspicion

The same user switched from a Plus account to a Team account and the Team workspace inherited the same 5-hour limit reached message. The reporter suspected browser session caching or shared authentication/session state.

## Independent quota windows

Another trace showed 5h quota and weekly quota being consumed at the same rate:

```text
The weekly and daily limits seem to be consumed at the same rate, and I can't understand why.
```

A later report said quota disappeared completely, weekly quota was halved, and the reset date moved by a few days until logout/login made it look normal again.
