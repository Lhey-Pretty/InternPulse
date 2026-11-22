# InternPulse backend

Laravel API for InternPulse. Emergency deployment changes are available from
**Coordinator -> Students -> View Profile**.

- **Emergency Pull-out** closes a placement without a replacement.
- **Transfer Company** closes the current placement and creates an accepted new deployment.
- **Redeploy Student** becomes available after a pull-out.
- **Awaiting Redeployment (Pulled Out)** in the directory finds students waiting for a new company.
- **View attendance and journals** exposes each deployment's records and coordinator review of unresolved attendance.

See [deployment workflow](docs/deployment-lifecycle.md) for rules, API requests,
hour accounting, and migration instructions, and
[validation results](docs/deployment-lifecycle-validation.md) for checks performed.
