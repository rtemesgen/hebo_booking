## 2025-05-15 - [Delete Confirmation & ARIA Labels]
**Learning:** Confirmation sheets for destructive actions are essential for user safety. Implementing them with `role="alertdialog"` and explicit entity names (e.g., "Delete 'Main Book'?") provides clear context and meets accessibility standards. Consolidating modal state management (visibility + item identity) into single close functions prevents state leakage.
**Action:** Always include the name of the entity being deleted in confirmation dialogs and use appropriate ARIA roles for modals.
