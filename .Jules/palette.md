## 2026-06-10 - Book Deletion Confirmation and Improved Accessibility
**Learning:** Destructive actions like book deletion require a confirmation step to prevent accidental data loss. Using semantic ARIA roles like `role="alertdialog"` and `aria-modal="true"` for these confirmation sheets ensures they are properly handled by assistive technologies.
**Action:** Always implement a confirmation flow for irreversible actions and provide descriptive `aria-label` attributes for icon-only buttons to improve the screen reader experience.
