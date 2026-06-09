## 2025-05-15 - Deletion Confirmation and ARIA Labels
**Learning:** Destructive actions like book deletion were immediate, leading to potential data loss if misclicked. Additionally, icon-only buttons like "..." (options) and "x" (close) were invisible to screen readers without descriptive labels.
**Action:** Implement a modal confirmation sheet for destructive actions using `role="alertdialog"` and `aria-modal="true"`. Ensure all icon-only buttons have specific `aria-label` attributes (e.g., "Close search", "Book options") to provide clear context for assistive technologies.
