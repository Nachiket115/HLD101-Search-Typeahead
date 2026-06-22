# Demo Video Checklist

Keep the recording short and show the application rather than presentation slides.

1. Show four healthy Docker services with `docker compose ps`.
2. Show `/health` reporting ready and the loaded Postgres query count.
3. Type a prefix and show no more than 10 suggestions.
4. Navigate suggestions with arrow keys and submit with Enter.
5. Switch between Trending and All time ranking for the same prefix.
6. Show the global Trending searches section.
7. Call `/cache/debug` twice for one prefix to show its owner and cache state.
8. Submit the same new normalized query twice, wait for or trigger the batch threshold, and show eventual eligibility.
9. Show `/metrics` with search events greater than database writes.
10. Stop one owning Redis node and show that suggestions still return from the Trie.
11. Show the measured performance report.

Store the final recording as a separate submission artifact. Do not include raw AOL data or user histories in the recording.
