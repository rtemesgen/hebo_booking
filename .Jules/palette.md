## 2025-05-30 - Deletion Confirmation Sheet Accessibility
**Learning:** Destructive action confirmation sheets require specific ARIA attributes to be fully accessible. This includes using `role="alertdialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the modal title. Additionally, icon-only close buttons (like "x") MUST have a descriptive `aria-label`.
**Action:** When implementing or modifying sheets in the Hebo UI, ensure these accessibility patterns are followed consistently.
