## 2026-05-21 - [ARIA Labels for Icon-Only Buttons]
**Learning:** Icon-only buttons using just "x" for closing/clearing are inaccessible to screen readers. Context-specific labels are crucial.
**Action:** Always add descriptive `aria-label` attributes to icon-only buttons (e.g., "Close search" instead of just "Close").

## 2026-05-21 - [Minimal Diffs and Lockfiles]
**Learning:** Implementing multiple UX improvements at once can lead to large diffs and accidental inclusion of lockfiles, violating "micro-UX" constraints.
**Action:** Focus on ONE improvement per task and use `replace_with_git_merge_diff` for surgical edits.
