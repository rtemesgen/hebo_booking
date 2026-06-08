## 2025-05-14 - [Destructive Action Confirmation]
**Learning:** Destructive actions, such as book deletion, must include a confirmation modal or sheet to prevent accidental data loss. For robust accessibility, these modals should use `role="alertdialog"`, `aria-modal="true"`, and implement an 'Escape' key listener for easy dismissal.
**Action:** When implementing new destructive flows, use a dedicated ref (like `itemToDelete`) to persist identity after the triggering menu is closed, ensuring the confirmation UI remains contextually accurate.
