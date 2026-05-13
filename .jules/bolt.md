
## 2025-05-15 - [O(R) Record Indexing and Formatter Caching]
**Learning:** In a data-heavy Vue/Pinia app, flat arrays that are frequently filtered (e.g., records by bookId) become a bottleneck at O(B * R). Pre-grouping into a Map in the store provides O(1) lookup. Also, Intl.NumberFormat construction is expensive and should never happen inside a loop or template formatter.
**Action:** Use computed Maps for grouping/indexing in Pinia stores. Cache formatters at the component or module level.
