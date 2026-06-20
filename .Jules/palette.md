## 2025-05-15 - [Accessible Deletion Confirmation]
**Learning:** Destructive actions like deletion must always include a confirmation step to prevent accidental data loss. Using `role="alertdialog"` and `aria-modal="true"` ensures the screen reader understands the urgent nature of the dialog. Adding `aria-label` to icon-only buttons (like '...') is essential for screen reader navigation.
**Action:** Always wrap destructive operations in a confirmation sheet and ensure all icon-only buttons have descriptive ARIA labels.
