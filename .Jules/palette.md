## 2025-06-18 - Book Deletion Confirmation and Accessibility
**Learning:** Destructive actions like book deletion must have a confirmation step to prevent accidental data loss. In a multi-modal environment like `BookListView.vue`, implementing a global 'Escape' key listener provides a consistent and accessible way for users to dismiss these overlays.
**Action:** Always wrap destructive actions in a confirmation dialog (`role="alertdialog"`) and ensure keyboard accessibility by supporting the 'Escape' key and providing clear ARIA labels for icon buttons.
