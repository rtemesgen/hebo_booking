## 2025-05-14 - [Accessibility and Interaction Feedback Patterns]
**Learning:** Icon-only buttons (common in this app's sheets and lists) lacked descriptive ARIA labels, making them inaccessible to screen readers. Additionally, async actions like record creation didn't provide immediate feedback, which can lead to double-submissions.
**Action:** Always add `aria-label` to "x" and "..." buttons. Implement `loading` states in submission buttons (disabling and text update). Use `aria-pressed` for toggleable selection chips.
