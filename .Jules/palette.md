## 2025-05-15 - [Accessibility & Feedback Patterns]
**Learning:** Icon-only buttons (like 'x' for close or '...' for options) and toggleable chips lacked semantic meaning for screen readers and immediate visual feedback during async operations.
**Action:** Always add `aria-label` to icon-only buttons, use `aria-pressed` for selection chips, and implement `isSaving` states to disable submit buttons and update text to "Saving..." during async tasks.
