# Deployment lifecycle validation

Validated locally on 2026-11-23 (Asia/Manila).

## Backend

**68 tests passed, 375 assertions**: 38 deployment lifecycle cases plus 30
existing soft-delete, student cleanup, journal classification queue and
evaluation policy regressions. Tests used SQLite in memory and the array mailer.

    APP_URL=http://localhost php artisan test --compact tests/Feature/PlacementLifecycleTest.php tests/Feature/SoftDeleteTest.php tests/Feature/TestStudentCleanupTest.php tests/Feature/JournalClassificationQueueTest.php tests/Feature/EvaluationPolicyTest.php

Coverage includes standalone pull-out, direct transfer, later redeployment,
both transfer endpoints, reuse of existing applications, original 480h target,
200h historical credits, fractional hours, late approval adjusting the new
target, coordinator decisions, completion across companies, replay checks,
stale form rejection, date/posting/program/capacity/acceptance validation,
ownership protections, history access, read-only records, credit backfill,
and rollback when notification storage fails. Additional cases verify specific
start/end date errors with the full posting schedule, the inclusive last-day
rule, and acceptance at the posting schedule boundaries.

The frozen Carbon and Firebase JWT clocks agree in these tests.
The full backend suite was not rerun for this feature; the selected relevant
regressions above passed.

## Frontend

The final production build passed (2058 modules). The transfer form uses
calendar limits based on the posting schedule and last working day. The schedule
panel and explanation were removed as requested. The additional overall OJT
progress banner was also removed from the student dashboard. Backend errors identify the
invalid date field and actual schedule.
Lint found no diagnostics in the new DeploymentRecords, DeploymentSelector
and manilaDate modules. Lint of affected existing panels returned exit 0 with
existing React effect/date warnings. No interactive browser check was performed.

The build retains the existing unresolved /InternPulse/images/minsu-bg.jpg
asset notice; Vite leaves that URL for runtime resolution.

## Local migration and record preservation

Only 2026_11_23_000001_add_deployment_lifecycle_and_credits was applied with
the explicit migration path. Connection was verified as APP_ENV=local,
MySQL on 127.0.0.1, database internpulse.

Original column values were compared with SHA-256 hashes before and after
the migration, normalizing numeric hour representation for the decimal
conversion. Every checked table retained its original records and row count.

| Table | Before | After |
| --- | ---: | ---: |
| users | 44 | 44 |
| student_profiles | 21 | 21 |
| company_profiles | 11 | 11 |
| internship_postings | 10 | 10 |
| applications | 12 | 12 |
| internship_placements | 9 | 9 |
| attendance_logs | 5 | 5 |
| journal_entries | 14 | 14 |
| weekly_logs | 0 | 0 |
| audit_logs | 52 | 52 |
| notifications | 55 | 55 |

Rendered hour total remained **30h**; summed placement requirements remained
**4320h**. Added target/baseline/closure/review columns are excluded from the
original-column hash comparison.

Read-only local controller checks for student overview, journal history,
attendance history, coordinator student detail and coordinator attendance
history all returned status 200 after the migration. These checks used existing
profiles without creating tokens, sending notifications or changing records.

No repository push or VPS modification was performed.
