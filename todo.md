# Project TODO

## Foundation and access control

- [x] Configure the bilingual application shell with Arabic RTL as the primary layout and English LTR support.
- [x] Replace the starter home screen with the clinic management dashboard shell.
- [x] Implement internal email-and-password authentication.
- [x] Implement the five roles: Super Admin, Branch Manager, Doctor, Receptionist, and Accountant.
- [x] Implement role-specific route protection and server-side authorization.
- [x] Implement role-specific dashboards with today's statistics and relevant alerts.

## Branch and organization management

- [x] Create the branch data model for three branches.
- [x] Build branch create, edit, view, activate, and working-hours workflows.
- [x] Define services offered by each branch.
- [x] Assign users to one or more branches.

## Doctors and specialties

- [x] Create doctor profiles and specialty management.
- [x] Support Obstetrics & Gynecology and Male Reproductive Medicine specialties.
- [x] Assign doctors to branches.
- [x] Configure weekly doctor schedules and availability.

## Unified patient records

- [x] Create unified patient records shared across all branches.
- [x] Support search by patient name, phone number, and patient ID.
- [x] Store personal data, allergies/sensitivities, and chronic conditions.
- [x] Prevent accidental duplicate patient records.

## Appointments

- [x] Build daily and weekly calendar views.
- [x] Create and edit bookings across branches and doctors.
- [x] Implement statuses: Booked, Confirmed, Arrived, Completed, Cancelled, and No-Show.
- [x] Add appointment history and filtering by branch, doctor, date, and status.

## Medical visits and attachments

- [x] Create a per-visit medical record linked to an appointment and patient.
- [x] Store chief complaint, diagnosis, medications, and follow-up plan.
- [x] Display the patient's complete visit history with access controls.
- [x] Upload and store lab results, radiology, and documents.
- [x] Enforce that every medical attachment is linked to a specific visit record.

## Payments and invoicing

- [x] Create services, invoices, payment records, and receipt data models.
- [x] Support cash, card, bank transfer, insurance, and partial payments.
- [x] Track unpaid, partially paid, paid, refunded, and cancelled states.
- [x] Generate printable receipts.
- [x] Restrict financial actions to permitted roles and record audit events.

## Reports and auditability

- [x] Build operational reports for bookings, attendance, cancellations, and no-shows.
- [x] Build financial reports for collections, outstanding balances, payment methods, and refunds.
- [x] Build doctor performance and new-patient reports.
- [x] Add branch and date-period filters to reports.
- [x] Create an audit log for sensitive changes and user actions.

## Offline and synchronization readiness

- [x] Define the offline-capable data and synchronization strategy for branch operations.
- [x] Preserve stable IDs and conflict metadata for future synchronization between branches.
- [x] Ensure appointment, patient, visit, and payment workflows have safe retry behavior.

## Quality and delivery

- [x] Add Vitest coverage for authentication, authorization, core data operations, and attachment ownership rules.
- [ ] Verify loading, empty, error, and permission-denied states in the UI.
- [ ] Test Arabic RTL and English LTR layouts.
- [x] Review primary workflow routes at desktop browser sizes and document empty-state coverage.
- [x] Run type checks and the full test suite.
- [ ] Capture a verified preview and save the first complete checkpoint.

## Review follow-ups

- [x] Fully localize the shared application shell, login prompts, navigation, and language state globally.
- [x] Implement or safely stub all primary sidebar routes so users do not hit 404 dead ends.
- [x] Build visit attachment upload and download flows with storage integration, validation, and UI states.
- [x] Add an explicit receipt data model and connect receipts to invoices and payments.
- [x] Implement audit-log writing in sensitive mutations and add tests proving audit entries are recorded.

## Test and data-integrity follow-ups

- [x] Add Vitest tests for successful patient creation and patient search operations.
- [x] Implement and test attachment ownership and visit-linkage rules.
- [x] Add Vitest coverage proving audit-log rows are written for patient creation and other sensitive mutations.

## Final review corrections

- [x] Add mutation tests for medical attachment upload success and mismatched visit/patient rejection.
- [x] Add an audit-log test for medical attachment upload in addition to patient creation.
- [x] Reinforce visit linkage in the attachment persistence layer where practical.

## Internal authentication follow-ups

- [x] Implement creation and management of internal user accounts for all supported staff roles.
- [x] Add Vitest coverage for internal setup, login success, and invalid credentials.
- [x] Verify internal setup and login loading and error states in the UI.

## User-management and auth review corrections

- [x] Add user edit, activate/deactivate, and password-reset actions for internal accounts.
- [x] Add duplicate username and email safeguards with tests.
- [x] Capture and review the internal authentication screens after the login/setup changes.

## User edit follow-up

- [x] Add an internal-user edit form for name, email, username, and role.
- [x] Add tests for successful user update and authorization restrictions.

## User edit UX corrections

- [x] Add pending and error-feedback states to the internal-user edit form.
- [x] Verify the edit workflow visually in the browser.
- [x] Add duplicate username/email feedback for user edits.

## Final user-flow verification

- [x] Add tests proving user create/update reject duplicate username or email conflicts.
- [ ] Exercise the user edit form with an actual internal account and verify save/error states interactively.

## Medical-history access corrections

- [x] Expand visit-history cards to show complaint, diagnosis, medications, follow-up plan, notes, timestamp, and clinician metadata.
- [x] Add server-side authorization rules for medical-history access by role and branch scope.
- [x] Add forbidden-access tests and UI permission/error states for medical-history queries.

## Branch-scope authorization corrections

- [x] Add branch-scope authorization to medical visit history queries and mutations using user and doctor branch assignments.
- [x] Add tests proving in-scope access is allowed and cross-branch access is forbidden.
- [x] Add UI handling for branch-scope permission denial on medical-history screens.

## Branch-scope enforcement corrections

- [x] Make out-of-scope medical-history access return an explicit FORBIDDEN error.
- [x] Add integration-style tests for assigned-branch history access and cross-branch rejection.
- [x] Show a dedicated branch-permission-denied state in the medical-history UI and verify it.

## Branch-scope final corrections

- [x] Enforce branch scope on medical-visit create/read using user-branch, doctor-branch, and appointment-branch relationships.
- [x] Add tRPC-level tests proving assigned-branch history returns data and cross-branch history throws FORBIDDEN.
- [x] Show a dedicated branch-scope denial message in MedicalRecordsPage and verify it in the browser.

## Billing review corrections

- [x] Add a receipt-specific printable view with invoice and payment details.
- [x] Add tests for payment methods, partial payment, overpayment rejection, and invoice status transitions.
- [x] Add refund and cancellation state transitions with audit events.
- [x] Add service selection and branch-specific pricing to invoice creation.

## Receipt and billing-flow corrections

- [x] Add a real receipt data structure/view tied to invoices and saved payments, including amount, method, reference, timestamp, and balance.
- [x] Update printable receipt output to include the actual payment details and remaining balance.
- [x] Add tRPC/db tests for cash, card, bank transfer, insurance, partial progression, overpayment rejection, and unpaid-to-partial-to-paid transitions.

## Billing flow test corrections

- [x] Add a billing-flow test that creates an invoice, records a partial payment, records a final payment, and verifies unpaid-to-partial-to-paid status changes.
- [x] Add a billing-flow rejection test proving overpayment leaves invoice and payment records unchanged.

## Invoice status-flow corrections

- [x] Add tests for invoice cancellation and refund transitions, paid-only refund enforcement, and audit events.
- [x] Add pending and error-feedback states for cancel/refund actions in PaymentsPage.
- [x] Verify invoice status actions visually in the browser.

## Interactive billing verification

- [ ] Exercise cancel and refund actions against real invoice states in the browser and record success, pending, and error behavior.

## Doctor-management corrections

- [x] Implement full specialty management with create, edit, activate, and deactivate actions.
- [x] Implement doctor profile edit/view management beyond the initial create/list form.
- [x] Ensure the required specialties are seeded or created: Obstetrics & Gynecology and Male Reproductive Medicine.
- [x] Add tests proving the required specialties are available through the API.
- [x] Replace comma-separated branch IDs with selectable branch assignments and support updating/removing assignments.
- [x] Add schedule edit/deactivate flows and overlap validation.
- [x] Use doctor schedules when calculating appointment availability.

## Specialty seed verification

- [x] Add a real database/API integration check proving both seeded specialties are returned.
- [x] Add a repeatable specialty bootstrap path that guarantees the required specialties exist before doctor creation.

## Specialty bootstrap enforcement

- [x] Call required-specialty bootstrap from doctor creation or a guaranteed server startup path.
- [x] Add an integration test covering an empty-specialties bootstrap through doctor creation and selection.

## Patient duplicate UX corrections

- [x] Add explicit duplicate-patient feedback in PatientsPage for rejected creates.
- [x] Verify the duplicate-patient flow in the browser and confirm no duplicate is created.
- [x] Add a database-backed uniqueness safeguard for phone numbers where compatible with clinic policy.

## Billing completeness corrections

- [x] Add a persisted receipt model linked to invoice and payment records.
- [x] Add service and branch-service management workflows for creating, editing, activating, and pricing services.
- [x] Add tests proving branch-priced invoice totals/items and invalid branch-service rejection.

## Branch and assignment verification corrections

- [x] Add explicit pending/success/error feedback for branch edit, activation, and working-hours mutations.
- [x] Await user branch-assignment persistence before closing the edit form and show assignment errors.
- [ ] Add tests or browser verification for branch edit and user-to-branch assignment flows.

## Final branch and user-assignment quality corrections

- [x] Add explicit success feedback and clearer pending labels for branch edit, activation/deactivation, and working-hours saves.
- [x] Coordinate user profile and branch-assignment updates through one server operation to avoid partial success.
- [ ] Perform interactive verification of branch and user-assignment save/error flows.

## Specialty edit verification corrections

- [x] Add a visible specialty edit workflow with pending, success, and error feedback.
- [x] Add test or browser verification for specialty rename and activate/deactivate behavior.

## Appointment calendar quality corrections

- [x] Implement a real time-grid weekly calendar instead of only adding a date column to the table.
- [x] Improve appointment history with readable patient/doctor/branch context and explicit query errors.
- [x] Add appointment list tests for date-range, branch, doctor, and status filters.

## Appointment quality follow-ups

- [x] Preserve existing appointment duration during edit and prevent ignored patient reassignment.
- [x] Convert the weekly view into a true time-grid calendar with hour positioning.
- [x] Return and display readable patient, doctor, and branch names in appointment history.
- [ ] Test actual appointment list filtering behavior at the data-query layer.
