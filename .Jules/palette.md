## 2026-06-02 - Loading states for auth actions
**Learning:** Async submission buttons without loading states can lead to duplicate requests and poor user feedback, especially during critical flows like login and registration.
**Action:** Always implement a reactive loading state (e.g., `isLoggingIn`, `isRegistering`) that disables the button, updates the button text, and includes `aria-busy="true"` to provide both visual and semantic feedback during asynchronous operations.
