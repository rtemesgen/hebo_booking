## 2026-06-17 - Accessible Confirmation Modals
**Learning:** Custom slide-up sheets used for destructive actions must implement full focus management (initial focus, focus return, and Esc key support) beyond just ARIA attributes to be truly accessible and prevent keyboard users from getting stuck.
**Action:** Always store `document.activeElement` before opening a modal and use a `keydown` listener for `Escape` and a `watch` or `onMounted` hook to manage focus transitions.
