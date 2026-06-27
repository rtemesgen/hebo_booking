## 2025-06-27 - [A11y/Safety: Destructive Action Confirmation]
**Learning:** Destructive actions like deleting a book should always have a confirmation step. Using an `alertdialog` role with `aria-modal="true"` and linking it to a title via `aria-labelledby` ensures that screen readers correctly identify the context and importance of the dialog. Additionally, including the name of the entity to be deleted in the confirmation text reduces accidental data loss.

**Action:** Always implement a confirmation modal for destructive actions, ensuring it follows the `alertdialog` pattern for maximum accessibility and provides clear context about the item being deleted.

## 2025-06-27 - [A11y: Icon-only Button Labels]
**Learning:** Icon-only buttons (like "x" for close or "..." for menu) are common in mobile-first designs but are inaccessible to screen readers unless they have an `aria-label`. Generic labels like "Close" are okay, but context-specific labels like "Close search" or "Book options" are even better for navigation.

**Action:** Audit all icon-only buttons and ensure they have descriptive `aria-label` attributes.
