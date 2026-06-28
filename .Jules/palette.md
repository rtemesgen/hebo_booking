## 2025-05-14 - [Delete Confirmation & ARIA labels]
**Learning:** Destructive actions like deleting a book should always have a confirmation modal to prevent accidental data loss. Using `role="alertdialog"` and `aria-modal="true"` ensures the modal is correctly interpreted by assistive technologies. Icon-only buttons (like "..." or "x") require explicit `aria-label` attributes to be accessible.
**Action:** Implement a confirmation bottom sheet for destructive actions using `alertdialog` role and ensure all icon-only buttons have descriptive `aria-label`s.
