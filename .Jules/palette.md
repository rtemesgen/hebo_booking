## 2025-05-14 - [Confirmation Sheets & ARIA Labels]
**Learning:** Destructive actions like book deletion require a multi-step confirmation flow to prevent data loss. Using `role="alertdialog"` and `aria-modal="true"` ensures the confirmation is accessible. Icon-only buttons (like "..." or "x") are common but require explicit `aria-label` for screen reader support.
**Action:** Always wrap destructive actions in a confirmation modal/sheet. Use context-specific ARIA labels for icon buttons (e.g., "Close search" instead of "Close").
