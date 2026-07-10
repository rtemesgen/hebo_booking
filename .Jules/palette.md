## 2025-05-14 - [Confirmation Dialog Pattern]
**Learning:** Destructive actions in mobile-first slide-up sheets should explicitly name the entity being deleted and provide a clear "Cancel" vs "Confirm" choice to prevent accidental data loss. Using `role="alertdialog"` and `aria-modal="true"` ensures screen readers treat the confirmation with appropriate urgency.

**Action:** Always implement confirmation modals for "Delete" actions in `BookListView.vue` and similar views, naming the target entity (e.g., "Delete 'Main Book'?") in the header.

## 2025-05-14 - [Accessibility for Ambiguous Triggers]
**Learning:** Icon-only buttons with "..." (ellipsis) are non-descriptive for screen readers. Providing an `aria-label` like "Book options" makes the interface navigable for users with visual impairments.

**Action:** Audit all icon-only buttons in `BookList.vue` and ensure they have descriptive `aria-label` attributes.
