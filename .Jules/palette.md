## 2025-06-05 - Confirmation Sheets for Destructive Actions
**Learning:** Providing a secondary confirmation step for destructive actions like deleting a book prevents accidental data loss and improves user confidence. Using a slide-up "sheet" pattern maintains visual consistency with other mobile-first interactions in the app.
**Action:** Always implement a confirmation modal or sheet for any action that cannot be easily undone, ensuring it clearly describes the consequences.

## 2025-06-05 - Accessibility for Icon-only Buttons
**Learning:** Icon-only buttons (like "..." for options or "x" for close) are opaque to screen readers if they lack descriptive text. Adding `aria-label` provides necessary context while maintaining the intended visual design.
**Action:** Ensure every icon-only or text-minimal button has a descriptive `aria-label` (e.g., "Book options" instead of "...") to comply with accessibility standards.

## 2025-06-05 - E2E Testing Collisions with Accessibility Labels
**Learning:** Adding descriptive accessibility labels to buttons (e.g., "Close add book") can cause Playwright locators using `getByRole('button', { name: 'Add Book' })` to match multiple elements because it matches substrings by default.
**Action:** Use `{ exact: true }` in Playwright locators for common action names to avoid ambiguity when similar strings are present in accessibility labels or headings.
