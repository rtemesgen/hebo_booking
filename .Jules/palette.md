## 2026-06-30 - [Delete Confirmation & Accessibility]
**Learning:** Confirmation dialogs for destructive actions should use `role="alertdialog"` and `aria-modal="true"` for screen reader clarity, and focusing the 'Cancel' button by default prevents accidental deletions. Icon-only buttons (like '...' or 'x') require explicit ARIA labels.
**Action:** Always implement ARIA roles for modals and provide labels for icon buttons.
