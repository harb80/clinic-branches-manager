# Project TODO

## Foundation and access control

- [x] Configure the bilingual application shell with Arabic RTL as the primary layout and English LTR support.
- [x] Replace the starter home screen with the clinic management dashboard shell.
- [ ] Implement internal email-and-password authentication.
- [ ] Implement the five roles: Super Admin, Branch Manager, Doctor, Receptionist, and Accountant.
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
- [ ] Store chief complaint, diagnosis, medications, and follow-up plan.
- [ ] Display the patient's complete visit history with access controls.
- [ ] Upload and store lab results, radiology, and documents.
- [x] Enforce that every medical attachment is linked to a specific visit record.

## Payments and invoicing

- [ ] Create services, invoices, payment records, and receipt data models.
- [ ] Support cash, card, bank transfer, insurance, and partial payments.
- [ ] Track unpaid, partially paid, paid, refunded, and cancelled states.
- [ ] Generate printable receipts.
- [ ] Restrict financial actions to permitted roles and record audit events.

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
- [ ] Build visit attachment upload and download flows with storage integration, validation, and UI states.
- [ ] Add an explicit receipt data model and connect receipts to invoices and payments.
- [x] Implement audit-log writing in sensitive mutations and add tests proving audit entries are recorded.

## Test and data-integrity follow-ups

- [x] Add Vitest tests for successful patient creation and patient search operations.
- [x] Implement and test attachment ownership and visit-linkage rules.
- [x] Add Vitest coverage proving audit-log rows are written for patient creation and other sensitive mutations.

## Final review corrections

- [x] Add mutation tests for medical attachment upload success and mismatched visit/patient rejection.
- [x] Add an audit-log test for medical attachment upload in addition to patient creation.
- [ ] Reinforce visit linkage in the attachment persistence layer where practical.
