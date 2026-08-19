# Interactive verification notes

## 2026-08-19

The bilingual dashboard loaded successfully after creating a test Super Admin account. The Arabic RTL layout rendered correctly, the dashboard showed the role badge for the Super Admin, and the cards displayed the expected zero-state labels: today's appointments, waiting patients, new patients this month, and today's collections. The alert panel displayed Super Admin-specific messages about permissions and unified reports.

The patient creation flow was verified with a non-sensitive test record (`PT-DEMO-001`, phone `01012345678`). The first save succeeded and the directory showed exactly one record. A second attempted record using a different patient number but the same phone was rejected with the localized message: "يوجد ملف بنفس رقم المريض أو رقم الهاتف. ابحث عن الملف الحالي بدل إنشاء ملف مكرر." The directory remained at one record, confirming no duplicate was created.

The first bootstrap attempt with an invalid email was rejected by server validation; a valid email was subsequently entered and the account was created successfully.
