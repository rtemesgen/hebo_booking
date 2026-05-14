## 2025-05-15 - [Book Deletion Confirmation]
**Learning:** Destructive actions like deleting a book (which removes all associated records) should never happen immediately on click, even if buried in a menu. A secondary confirmation step is essential for data safety.
**Action:** Always implement a confirmation modal or sheet for destructive actions and ensure close buttons have descriptive ARIA labels.
