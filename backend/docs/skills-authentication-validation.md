# Skills authentication fix

Validated locally on 2026-11-23 (Asia/Manila).

The student Skills tab could retain an Unauthenticated error while the session
already had a refreshed valid token. Its initial load issued duplicate requests,
and the shared API client rejected a late 401 from the previous token after
another request completed renewal. Queued retries could also trigger a second
refresh instead of stopping after one retry.

The API client now shares refresh promises within the captured session, tracks
known token renewals, and retries late old-token responses once with the current
token. Requests from an unrelated login cannot refresh or sign out the current
session. Old refresh responses cannot overwrite a new login, and expired/invalid
current sessions still clear authentication and return to login.

Skills performs one debounced fetch with cancellation on search changes/unmount.
A successful response clears an old error. Failed requests have a Retry control.
Authentication remains required on the API; no permission check was removed.

## Verification

- npm test: **11 frontend tests passed** using Axios adapters and fake storage;
  tests perform no network requests.
- Two regression cases failed before the client fix, reproducing the late 401
  and duplicate refresh behavior; both pass after the change.
- Coverage includes shared refresh, delayed responses, consecutive renewals,
  cancellation, failed renewal, failed login, and switching sessions while
  requests/refreshes are pending.
- Frontend production build passed.
- Lint of src/api/client.js, SkillsPanel.jsx and the new test file found no diagnostics.
- Backend: **27/28 tests passed, 124 assertions** in StudentSkillsAuthenticationTest,
  AuthTest and SoftDeleteTest. All five new Skills tests passed, including JWT
  access, expired-token refresh, revocation, role checks, and program search.
- The existing AuthTest assertion expecting Illuminate Auth ResetPassword
  notification failed. No password-reset implementation was changed in this fix.

Tests used the isolated SQLite in-memory database. No local student/company
records were edited, no VPS was changed, and no git push was performed.

Follow-up: the password-reset assertion was corrected, and the full backend
suite now passes (113 tests, 734 assertions). See
[password-reset validation](password-reset-validation.md).
