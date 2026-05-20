# Palette's Journal - Hebo UX & Accessibility

## 2025-05-14 - [Form Accessibility & Feedback]
**Learning:** Forms in the app often lack standard HTML5 validation attributes (`required`) and ARIA labels, which can lead to a confusing experience for screen reader users and lack of immediate feedback for all users. Adding loading states to submission buttons prevents duplicate entries and provides clear interaction feedback.
**Action:** Always include `required` and `aria-required="true"` on mandatory fields. Implement loading states for async submission buttons using the `serverWriteInFlight` state from the store. Ensure all icon-only buttons (like close 'x') have descriptive `aria-label` attributes.
