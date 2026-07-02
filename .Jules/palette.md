## 2026-07-02 - [Missing template refs in focus management]
**Learning:** Implementing focus management logic in the script (e.g., using `watch` and `nextTick`) without the corresponding `ref` attribute in the template fails silently, leaving the UI inaccessible to keyboard users despite the code appearing correct.
**Action:** Always verify that every ref used for focus management in the script has a matching `ref="..."` attribute on the target element in the template.
