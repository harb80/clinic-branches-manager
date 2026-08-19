# Project TODO

## Foundation and access control

- [x] Configure the bilingual application shell with Arabic RTL as the primary layout and English LTR support.
- [x] Replace the starter home screen with the clinic management dashboard shell.
- [x] Implement internal email-and-password authentication.
- [x] Implement the five roles: Super Admin, Branch Manager, Doctor, Receptionist, and Accountant.
- [ ] Implement role-specific route protection and server-side authorization.
- [ ] Implement role-specific dashboards with today's statistics and relevant alerts.

## Branch and organization management

- [x] Create the branch data model for three branches.
- [ ] Build branch create, edit, view, activate, and working-hours workflows.
- [ ] Define services offered by each branch.
- [ ] Assign users to one or more branches.

## Doctors and specialties

- [ ] Create doctor profiles and specialty management.
- [ ] Support Obstetrics & Gynecology and Male Reproductive Medicine specialties.
- [ ] Assign doctors to branches.
- [ ] Configure weekly doctor schedules and availability.

## Unified patient records

- [x] Create unified patient records shared across all branches.
- [x] Support search by patient name, phone number, and patient ID.
- [x] Store personal data, allergies/sensitivities, and chronic conditions.
- [ ] Prevent accidental duplicate patient records.

## Appointments

- [ ] Build daily and weekly calendar views.
- [ ] Create and edit bookings across branches and doctors.
- [ ] Implement statuses: Booked, Confirmed, Arrived, Completed, Cancelled, and No-Show.
- [ ] Add appointment history and filtering by branch, doctor, date, and status.

## Medical visits and attachments

- [x] Create a per-visit medical record linked to an appointment and patient.
- [x] Store chief complaint, diagnosis, medications, and follow-up plan.
- [x] Display the patient's complete visit history with access controls.
- [x] Upload and store lab results, radiology, and documents.
- [x] Enforce that every medical attachment is linked to a specific visit record.

## Payments and invoicing

- [ ] Create services, invoices, payment records, and receipt data models.
- [x] Support cash, card, bank transfer, insurance, and partial payments.
- [x] Track unpaid, partially paid, paid, refunded, and cancelled states.
- [x] Generate printable receipts.
- [x] Restrict financial actions to permitted roles and record audit events.

## Reports and auditability

- [ ] Build operational reports for bookings, attendance, cancellations, and no-shows.
- [ ] Build financial reports for collections, outstanding balances, payment methods, and refunds.
- [ ] Build doctor performance and new-patient reports.
- [ ] Add branch and date-period filters to reports.
- [x] Create an audit log for sensitive changes and user actions.

## Offline and synchronization readiness

- [ ] Define the offline-capable data and synchronization strategy for branch operations.
- [ ] Preserve stable IDs and conflict metadata for future synchronization between branches.
- [ ] Ensure appointment, patient, visit, and payment workflows have safe retry behavior.

## Quality and delivery

- [x] Add Vitest coverage for authentication, authorization, core data operations, and attachment ownership rules.
- [ ] Verify loading, empty, error, and permission-denied states in the UI.
- [ ] Test Arabic RTL and English LTR layouts.
- [ ] Test the primary workflows on desktop browser sizes.
- [x] Run type checks and the full test suite.
- [ ] Capture a verified preview and save the first complete checkpoint.

## Review follow-ups

- [x] Fully localize the shared application shell, login prompts, navigation, and language state globally.
- [x] Implement or safely stub all primary sidebar routes so users do not hit 404 dead ends.
- [x] Build visit attachment upload and download flows with storage integration, validation, and UI states.
- [ ] Add an explicit receipt data model and connect receipts to invoices and payments.
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

- [ ] Enforce branch scope on medical-visit create/read using user-branch, doctor-branch, and appointment-branch relationships.
- [ ] Add tRPC-level tests proving assigned-branch history returns data and cross-branch history throws FORBIDDEN.
- [ ] Show a dedicated branch-scope denial message in MedicalRecordsPage and verify it in the browser.

## Billing review corrections

- [x] Add a receipt-specific printable view with invoice and payment details.
- [x] Add tests for payment methods, partial payment, overpayment rejection, and invoice status transitions.
- [x] Add refund and cancellation state transitions with audit events.
- [ ] Add service selection and branch-specific pricing to invoice creation.

## Receipt and billing-flow corrections

- [x] Add a real receipt data structure/view tied to invoices and saved payments, including amount, method, reference, timestamp, and balance.
- [x] Update printable receipt output to include the actual payment details and remaining balance.
- [x] Add tRPC/db tests for cash, card, bank transfer, insurance, partial progression, overpayment rejection, and unpaid-to-partial-to-paid transitions.

## Billing flow test corrections

- [ ] Add a billing-flow test that creates an invoice, records a partial payment, records a final payment, and verifies unpaid-to-partial-to-paid status changes.
- [ ] Add a billing-flow rejection test proving overpayment leaves invoice and payment records unchanged.

## Invoice status-flow corrections

- [ ] Add tests for invoice cancellation and refund transitions, paid-only refund enforcement, and audit events.
- [x] Add pending and error-feedback states for cancel/refund actions in PaymentsPage.
- [x] Verify invoice status actions visually in the browser.

## Interactive billing verification

- [ ] Exercise cancel and refund actions against real invoice states in the browser and record success, pending, and error behavior.
