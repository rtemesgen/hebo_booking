## 2026-06-19 - [Book Deletion Confirmation]
**Learning:** When implementing confirmation dialogs for destructive actions, prioritize safety by focusing the 'Cancel' button by default on open to prevent accidental keyboard-triggered confirmation.
**Action:** Use a `watch` on the visibility flag and `await nextTick()` to ensure the DOM has updated and the ref is bound before calling `.focus()` on the cancel button.
