## 2026-06-12 - [Book Deletion Confirmation & Accessibility]
**Learning:** Destructive actions like book deletion must be gated by a confirmation modal that explicitly names the target entity to prevent accidental data loss. Standardizing icon-only buttons with descriptive `aria-label` attributes is critical for accessibility.
**Action:** Always implement `role="alertdialog"` for confirmation modals and ensure every icon-only trigger has a clear ARIA label.
