## 2025-05-14 - [A11y/UX] Improving Semantics for Interactive Elements
**Learning:** The application frequently uses icon-only buttons (like 'x' for closing sheets) and visual-only state indicators (like payment mode chips and selection dots) which are inaccessible to screen readers.
**Action:** Always add `aria-label` to icon-only buttons and use `aria-pressed` for toggleable elements like chips to ensure their state and purpose are communicated semantically.
