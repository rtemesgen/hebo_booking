## 2025-05-23 - [Improved Sheet Accessibility and Feedback]
**Learning:** Icon-only buttons (like 'x' for closing sheets) must have explicit `aria-label` attributes to be accessible to screen reader users. Additionally, providing immediate visual feedback on async submission buttons (loading state) prevents duplicate submissions and improves user confidence during network operations.
**Action:** Always add `aria-label` to icon-only buttons and implement `isLoading` props for submission components, connecting them to store-level in-flight states.
