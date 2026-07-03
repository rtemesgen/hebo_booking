# Palette Journal 🎨

## 2025-05-14 - [Confirmation for Destructive Actions]
**Learning:** Destructive actions like deleting a book (which also removes associated records) should never be immediate. Providing a confirmation dialog with the entity's name reduces accidental data loss and improves user confidence.
**Action:** Always implement modal confirmation sheets (alertdialog) for destructive actions, explicitly stating what will be deleted.
