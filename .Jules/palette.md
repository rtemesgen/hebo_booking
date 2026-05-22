## 2025-05-14 - [Accessible Close Buttons]
**Learning:** Icon-only buttons using 'x' as content are inaccessible to screen readers without descriptive ARIA labels. Users benefit from context-specific labels like "Close search" rather than a generic "Close".
**Action:** Always add `aria-label` to icon-only buttons, especially when using 'x' for closing sheets or dialogs.

## 2025-05-14 - [Playwright Strict Mode & ARIA Labels]
**Learning:** Adding descriptive ARIA labels to buttons can cause Playwright "strict mode violation" if the test locators are too broad (e.g., matching both "Add Book" and "Close add book" with `getByRole('button', { name: 'Add Book' })`).
**Action:** Use `exact: true` in Playwright locators when multiple buttons share similar names but different ARIA labels, or use more specific roles/labels.
