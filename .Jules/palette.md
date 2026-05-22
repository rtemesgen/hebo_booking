## 2025-05-14 - [Accessible Close Buttons]
**Learning:** Icon-only buttons using 'x' as content are inaccessible to screen readers without descriptive ARIA labels. Users benefit from context-specific labels like "Close search" rather than a generic "Close".
**Action:** Always add `aria-label` to icon-only buttons, especially when using 'x' for closing sheets or dialogs.
