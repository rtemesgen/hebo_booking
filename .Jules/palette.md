## 2025-05-15 - [ARIA Labels for Icon-Only Buttons]
**Learning:** Many interactive elements in the application use icon-only buttons (e.g., "x" for close/clear, "..." for options) without descriptive text or ARIA labels, making them inaccessible to screen reader users.
**Action:** Always verify that buttons without visible text have an `aria-label` describing their function (e.g., `aria-label="Close"`, `aria-label="Book options"`).

## 2025-05-15 - [Destructive Action Confirmations]
**Learning:** The application initially allowed immediate deletion of major entities (like Books) without confirmation, posing a high risk of accidental data loss in a mobile-first UI.
**Action:** Implement a slide-up confirmation sheet for all destructive actions, explicitly naming the entity to be deleted to provide clear context.
