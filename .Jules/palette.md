## 2025-05-18 - Loading states for async submissions
**Learning:** Users need immediate feedback for async operations like adding a book or record. Using `serverWriteInFlight` from the store allows for a centralized loading state that can disable buttons and update text to 'Saving...' or 'Adding...'.
**Action:** Always implement a loading state for async submission buttons to prevent duplicate requests and provide interaction feedback.

## 2025-05-18 - Accessible selection chips
**Learning:** Toggleable chips (like payment modes) must use `aria-pressed` to semantically communicate their active state to screen readers.
**Action:** Use `:aria-pressed="isActive"` on button chips that represent a selection state.
