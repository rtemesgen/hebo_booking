## 2025-05-14 - Destructive Action Confirmation
**Learning:** Deleting data should never be an immediate action. Implementing a confirmation sheet (modal) provides a safety net for users and improves the perceived reliability of the app. Using `role="alertdialog"` and `aria-modal="true"` ensures the confirmation is accessible to screen reader users.
**Action:** Always wrap destructive actions in a confirmation flow. Use consistent ARIA attributes for modal dialogs.

## 2025-05-14 - Accessibility for Icon-only Buttons
**Learning:** Buttons with only icons or non-descriptive text (like "...") are invisible to screen readers.
**Action:** Always provide an `aria-label` for icon-only buttons to ensure they are accessible.
