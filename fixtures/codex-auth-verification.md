# Codex sign-in and account verification fixture

## Public-style issue signals

- Phone number verification doesn't work after logging out on one device and signing in on another device with SSO.
- The Codex sign-in screen asks for phone verification even though the ChatGPT account normally uses Google or Apple SSO.
- The SMS verification code is not received, shows `invalid_phone_number`, or the user gets a phone call from random numbers instead of a predictable verification code.
- "Sign in With ChatGPT" needs to be robust across Plus, Pro, Teams, Enterprise, personal workspace, and organization-verified account types.
- Some users can finish browser login, but the Codex CLI or extension still says the organization needs to be verified or starts in the wrong workspace.
- In the VS Code extension, a new chat shows "Error starting conversation" while initializing a chat after sign-in.

## Evidence checklist

- Codex app, CLI, or extension version and OS.
- Surface: Desktop, CLI, VS Code extension, browser login, or device-auth flow.
- Redacted account type, workspace or organization, SSO provider, and whether ChatGPT sign-in was used.
- Exact redacted error text, timestamp, screenshots with phone number/email/token removed, and whether another browser/device/account works.
