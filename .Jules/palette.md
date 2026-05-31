# Palette Journal - Hebo UX & Accessibility

## 2025-05-15 - [Safety Confirmation for Destructive Actions]
**Learning:** Destructive actions like book deletion should never be immediate. Implementing a multi-step confirmation flow using the "sheet" pattern provides a consistent and safe user experience.
**Action:** Always include a confirmation modal/sheet for data deletion, ensuring the identity of the item to be deleted is clearly displayed.

## 2025-05-15 - [Accessibility for Icon-only Buttons]
**Learning:** Icon-only buttons (like '...' and 'x') are ubiquitous in the app but completely inaccessible to screen readers without explicit labels.
**Action:** Use `aria-label` for all interactive elements that do not have visible text labels.

## 2025-05-15 - [A11y for Alert Dialogs]
**Learning:** Modal sheets used for confirmation must implement `role="alertdialog"` and `aria-modal="true"` to correctly trap focus and signal their importance to assistive technologies.
**Action:** Apply `role="alertdialog"` and `aria-labelledby` to all destructive confirmation sheets.
