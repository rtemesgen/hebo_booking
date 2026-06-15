## 2025-05-14 - Accessible Confirmation Sheets for Destructive Actions
**Learning:** Confirmation modals for destructive actions (like deleting a book) must use `role="alertdialog"` and `aria-modal="true"` to ensure screen readers prioritize the interruption. Linking the title to the dialog via `aria-labelledby` provides immediate context upon opening.
**Action:** Always wrap confirmation overlays in an `alertdialog` role and ensure the primary action button (e.g., 'Delete') has a clear, descriptive label and reflects loading states using existing store properties like `serverWriteInFlight`.
