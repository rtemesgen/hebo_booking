## 2026-05-29 - [Async Interaction Feedback]
**Learning:** In an offline-first app where operations might take time to hit the backend or remain in a sync queue, providing immediate visual feedback during the transition state (e.g., 'Saving...') is crucial to prevent duplicate submissions and user anxiety.
**Action:** Implement loading states for asynchronous submission buttons, disabling them and updating text to reflect the in-flight status.
