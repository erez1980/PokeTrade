# Privacy & security (child-safe by design)

* **No accounts, no login, no Pokémon GO credentials**, no game-account access.
* **No chat, no public profiles, no marketplace, no payments, no ads, no analytics/third-party scripts.**
* **No location** access. Permissions-Policy disables camera and geolocation.
* **Local-only data:** collection and wishlist live in the browser's IndexedDB. Nothing is sent to any server. Users can export/import a JSON backup and wipe everything from Settings. If IndexedDB is unavailable, the app falls back to memory and warns the user.
* **Voice:** the microphone starts only on an explicit tap. The app never accesses or stores audio — it receives text transcripts from the browser's Web Speech API. Some browsers (e.g. Chrome) process speech on the vendor's servers; this is disclosed next to the mic. No server-side transcription is used. Any future server-side provider requires a separate, child-focused privacy review and explicit disclosure.
* **Input validation:** the catalog is Zod-validated on load; every IndexedDB row is validated on read and write; backups are size-limited, schema-validated, length-limited (nickname 40, notes 500) and unknown species are skipped. React escapes all rendered text; no `dangerouslySetInnerHTML` is used.
* **CSP** (meta + recommended headers), `no-referrer`, `nosniff`, external images restricted to `raw.githubusercontent.com`, `connect-src 'self'`.
* **Admin view** (`/admin`) is read-only, shows only public build metadata, holds no credentials, and is `noindex`.
* **Third-party rights:** see [DATA_SOURCES.md](DATA_SOURCES.md).
