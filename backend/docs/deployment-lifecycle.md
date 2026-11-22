# Emergency pull-out, transfer and redeployment

The coordinator operates from Students -> View Profile. Student/company accounts
and original deployment records remain intact throughout these transitions.

## Workflow

1. **Emergency Pull-out**: enter a reason and the inclusive last working day.
   No replacement is required. The placement becomes pulled_out; the original
   application becomes withdrawn to release its slot.
2. Review pending attendance using **View attendance and journals** on the old
   deployment. Approve verified time-in/out, or reject with a reason. Approval
   can include a verified missing time-out. The decision is final and audited.
3. **Redeploy Student**: choose a verified partner and approved posting, supply
   start/end dates, reason, and confirm that the company has accepted the student.
4. **Transfer Company** combines closure and redeployment in one transaction
   when a replacement is already confirmed. The old placement becomes transferred.
5. The student selects each company in Journal or Attendance deployment history.
   Historical records are read-only; current writes must fall inside the active
   deployment's dates.

The last working day cannot precede the original start or exceed today in
Asia/Manila. Existing attendance, journals or weekly logs after a proposed
cutoff cause validation failure, preserving records. New start must be later
than the last working day and both new dates must fit the posting schedule.
Coordinators can review the company posting separately. Date pickers use the
posting schedule and last working day as bounds; API errors identify the invalid
field and include the actual posting schedule.
The original planned end date remains available alongside the actual cutoff.

The selected posting must belong to the selected company, be approved, have
capacity (including a slot already reserved by the student's accepted application),
and match the student's program. A shared partner with no program assignment
is allowed; the posting's course requirement still applies. The target must be
a different company. Acceptance is a coordinator attestation saved in the audit
trail; the application row is created or reused and becomes accepted.

Student scope, source placement ID, locks, and validation prevent cross-program
actions, stale requests and repeated transitions. Both legacy transfer endpoints
delegate to the same service. Transitions, hours, application changes, audit rows,
and in-app notifications for the student and affected companies commit together.
No email is sent by these lifecycle actions.

## Hours and history

The ojt_required_hours field freezes the original overall target at the earliest
placement requirement, with the student profile as the fallback before any
deployment. Each placement keeps only its own attendance and credited hours.
New placements start with zero rendered hours; historical logs and journals
are never copied.

Example: original target **480h**, first company **200h** credited, new company
**0h** -> overall **200/480h**, with **280h remaining**. A later approved **7.5h**
old-company shift produces **207.5/480h** and adjusts the active deployment target
to **272.5h**. Decimal storage and casts retain fractional shifts.

Recorded hours require both time-in and time-out approval to be credited.
Legacy/manual credits without a corresponding attendance record are retained.
Migration baseline is max(existing rendered - sum(all recorded hours), 0);
pending recorded hours are not silently made into legacy credits. Migration does
not rewrite existing rendered totals. Subsequent synchronization computes baseline
plus approved attendance, excluding coordinator rejections.

A company can access only deployments and attendance belonging to its own
postings, including historical/soft-deleted postings. Journals stay private to
the student and coordinator. A company cannot override a coordinator decision
or mark a pulled-out/transferred placement completed. Completion of the active
placement requires the original overall hour requirement to be met.

## API

All paths are under /api/v1 and require an authenticated account.

| Action | Method / path |
| --- | --- |
| Pull-out | POST coordinator/students/{studentProfile}/pull-out |
| Transfer / redeploy | POST coordinator/students/{studentProfile}/transfer |
| Alternate transfer | POST coordinator/placements/{placement}/transfer |
| Deployment attendance | GET coordinator/students/{studentProfile}/attendance?placement_id=... |
| Attendance decision | PATCH coordinator/attendance/{attendanceLog}/review |
| Student journal history | GET student/journals?placement_id=... |
| Student attendance history | GET student/attendance?placement_id=... |
| Coordinator journal history | GET coordinator/journals?student_id=...&placement_id=... |

Pull-out requires source_placement_id, last_working_date (YYYY-MM-DD), and reason.
Transfer also requires new_company_id, new_posting_id, start_date, end_date,
and acceptance_confirmed. The alternate transfer path accepts the legacy
new_internship_posting_id and transfer_reason names, using its bound placement
as the source. Expanded date and acceptance checks apply equally.

Attendance review requires decision (approved or rejected) and reason; time_out
(HH:mm) is needed for approval when the record lacks it. Student forms send
placement_id to reject stale company context after a transition.
Journal/attendance reads include placement, deployments, and can_write.

## Migration

Apply this migration after the prerequisite schema is present, using the backend directory:

    php artisan migrate --path=database/migrations/2026_11_23_000001_add_deployment_lifecycle_and_credits.php --force

Use the exact migration path; historical pending data migrations must be reviewed
separately. This migration adds lifecycle/approval metadata, the overall target,
and decimal hour columns. It does not delete students, companies, placements,
applications, attendance or journals. Its down migration retains decimal hour
types and expanded statuses to avoid truncating existing data.

The migration was applied only to the confirmed local internpulse database.
Repository publishing and VPS deployment remain separate actions.
