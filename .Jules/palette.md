## 2025-05-24 - [Form Interaction and Accessibility Patterns]
**Learning:** The 'books' store provides a `serverWriteInFlight` state which should be used to provide immediate feedback and prevent double-submissions on all record/book creation forms. Additionally, the 'chip' selection pattern (e.g., Payment Mode) lacks semantic state communication.
**Action:** Implement 'Saving...' loading states on submit buttons using `serverWriteInFlight`. Use `aria-pressed` on custom chip buttons to communicate active state to screen readers.
