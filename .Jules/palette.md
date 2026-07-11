## 2025-05-15 - [Destructive Action Confirmations]
**Learning:** Destructive actions like deleting a book should always have a confirmation step, especially in mobile-first UIs where accidental taps are common. Using a slide-up confirmation sheet provides clear context (e.g., mentioning the entity name) and a safe "Cancel" path, improving user confidence.
**Action:** Implement slide-up confirmation sheets for all primary destructive actions, ensuring they mention the target entity name and include clear "Cancel" vs "Delete" distinctions.

## 2025-05-15 - [Icon-only Button Accessibility]
**Learning:** Icon-only buttons (like "..." or "x") are completely opaque to screen readers if they lack ARIA labels. Users rely on these for navigation and action, so `aria-label` is mandatory for accessibility.
**Action:** Always include descriptive `aria-label` attributes for icon-only buttons and use `&times;` for a more polished close icon.
