## 2025-05-26 - Confirmation Persistency Pattern
**Learning:** When using a confirmation sheet triggered from an options menu, the initial selection reference (e.g., `activeMenuBook`) is often cleared to close the menu. If the sheet depends on this ref, it will lose context (e.g., the book name will disappear).
**Action:** Use a dedicated 'pending' ref (e.g., `bookToDelete`) to hold the item's identity during the confirmation flow, allowing the menu to be dismissed without losing UI context.

## 2025-05-26 - Contextual Accessibility Labels
**Learning:** Generic 'Close' labels are less helpful than contextual ones (e.g., 'Close search', 'Close delete confirmation') for users navigating complex UIs with multiple overlays.
**Action:** Always provide specific ARIA labels for 'x' buttons that describe exactly what they are closing.
