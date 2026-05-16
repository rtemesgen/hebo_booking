## 2026-05-16 - [Async Submission Feedback & Semantic Toggle State]
**Learning:** Users need immediate feedback for asynchronous operations to prevent duplicate submissions and clarify system status. Semantic markup like `aria-pressed` is essential for communicating the state of toggleable elements to assistive technologies.
**Action:** Always implement a loading state for async submission buttons (disabling and updating text) and use `aria-pressed` for selection chips.
