## 2025-07-24 - [Accessibility & Feedback in Forms]
**Learning:** Icon-only buttons (like "...") and toggle chips need semantic ARIA attributes (`aria-label`, `aria-pressed`) to be accessible. Async operations should provide immediate interaction feedback via button loading states.
**Action:** Use `aria-label` for icon-only buttons, `aria-pressed` for active toggle states, and implement 'Saving...' states on submit buttons using store-level flight status.
