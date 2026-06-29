## 2025-05-14 - Modal Accessibility & Safety
**Learning:** Confirmation modals for destructive actions (like deleting a book) significantly improve user confidence and prevent accidental data loss. Robust accessibility requires 'role="alertdialog"', 'aria-modal="true"', and explicit focus management using 'nextTick' and 'watch' to target the 'Cancel' button by default.
**Action:** Always implement modal focus trapping and ensure destructive actions have a non-destructive default focus target (e.g., 'Cancel') to prevent accidental keyboard-triggered execution.
