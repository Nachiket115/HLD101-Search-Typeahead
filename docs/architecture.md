# Architecture Decisions

## Request Path

1. Normalize and validate the prefix.
2. Hash the normalized prefix onto the consistent-hashing ring.
3. Read the mode-specific result from the owning Redis node.
4. On miss or node failure, walk the Trie to the prefix node.
5. Traverse that prefix subtree and evaluate matching records using a fixed-size top-10 heap.
6. Cache and return the result.

## Write Path

1. Normalize and validate the submitted full query.
2. Add one event to the active in-memory buffer.
3. Swap buffers after 30 seconds or 100 events.
4. Aggregate repeated queries and update Postgres transactionally.
5. Merge a failed transaction back into the active buffer.
6. Incrementally update shared records in the Trie after commit.
7. Allow existing Redis values to expire naturally.

## Consistency

Search-count and ranking updates are eventually consistent. A submitted event becomes durable after its batch commits, becomes visible on Trie cache misses immediately after that commit, and becomes visible on cached prefixes after their one-hour TTL expires.

## Horizontal Scaling Boundary

The assignment runs one API process. Each additional API process would otherwise own a separate Trie and in-memory queue. Production horizontal scaling would require shared durable event ingestion and coordinated index refreshes; those systems are intentionally outside this submission's scope.
