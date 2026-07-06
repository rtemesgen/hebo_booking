## 2025-05-15 - [Confirmation Dialogs & Modal Accessibility]
**Learning:** Modal confirmation sheets for destructive actions (like deleting a book) should use `role="alertdialog"`, `aria-modal="true"`, and `aria-labelledby` linked to the title ID to ensure accessibility.
**Action:** Always implement these ARIA attributes when creating new confirmation overlays.

## 2025-05-15 - [Icon-only Button Accessibility]
**Learning:** Icon-only buttons (like "..." or "x") are completely invisible to screen readers without an `aria-label`.
**Action:** Audit all interactive elements with non-text content for missing `aria-label` attributes.
