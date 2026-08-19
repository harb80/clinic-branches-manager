# Visual Review Notes

The latest desktop preview confirms that the Arabic RTL shell renders with a persistent sidebar, readable hierarchy, and consistent medical teal accent. The users page shows the internal account management empty state, the appointments page shows the day/week controls and empty schedule state, and the patients page shows the unified search state. The root route briefly displays the authentication/loading skeleton while session state resolves; this remains an area to verify after local setup credentials are created.

A second desktop capture of `/users` confirms the persistent RTL navigation and empty-state layout remain stable after adding edit and account-action logic. The captured state contains no internal accounts, so the edit form itself requires a seeded or newly bootstrapped staff account to exercise interactively.

The latest captures show the branches empty state with a clear add-branch entry point and the medical attachment screen with Arabic RTL labels, visit/patient inputs, file picker, allowed formats, 10 MB limit, and upload action. Both screens preserve the shared sidebar and visual hierarchy. Actual upload requires an existing visit and patient record, so the interaction remains data-dependent.

The medical records screen now visibly presents a structured Arabic RTL form for patient, appointment, doctor, complaint, diagnosis, medications, follow-up, and visit notes, followed by the attachment section. The layout remains consistent with the shared clinic sidebar and the primary teal action style.

The billing preview shows a clear Arabic RTL two-column layout for new invoices and payment recording, followed by a filterable invoice list. The payment form exposes cash, card, bank transfer, insurance, and other methods, while invoice cards show total, status, and a printable receipt action.

The billing screen remains visually coherent in Arabic RTL after adding receipt details and invoice status actions. The primary forms remain visible above the invoice list; detailed receipt content appears after selecting an invoice, preserving the existing sidebar and teal action hierarchy.

The doctors screen presents a clean Arabic RTL form for specialty, user link, license, phone, consultation fee, and branch IDs, followed by a registered-doctors list. The reports screen presents branch/date filters and metric cards for bookings, completed, cancelled, collections, and new patients. Both screens preserve the shared sidebar and teal medical visual language.
