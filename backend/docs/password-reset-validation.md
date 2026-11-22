# Password-reset test fix

Validated locally on 2026-11-23 (Asia/Manila).

The failing AuthTest asserted Laravel's default ResetPassword notification,
while User sends the application's queued CustomResetPassword notification.
The assertion now checks the actual notification, mail channel, usable broker
token and frontend reset URL. Production password-reset behavior was preserved.

Added 16 password-reset cases covering queue delivery, absolute/relative frontend
URLs, encoded email addresses, hashed tokens, successful reset and sign-in,
lockout cleanup, strength rules, confirmation, invalid/expired/mismatched tokens,
one-time use, unknown email and repeated request throttling.

Validation:

- Focused AuthTest, PasswordResetTest and StudentSkillsAuthenticationTest:
  **25 tests passed, 114 assertions**.
- Full backend suite: **113 tests passed, 734 assertions**.

Tests used SQLite in memory and fake notification/queue delivery.
No live accounts or VPS configuration were changed. No git push was performed.
