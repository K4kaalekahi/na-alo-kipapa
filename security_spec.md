# Security Specification - Mo'olelo App

## Data Invariants
1. A user profile (`users`) must exactly match the authenticated user's UID and email.
2. User progress (`userProgress`) must be owned by the authenticated user and cannot have negative points.
3. Saved words must belong to a valid user and have unchangeable ownership.
4. Content (Reading, Culture) is public for reading but strictly admin-only for writes.
5. All timestamps (`createdAt`, `lastActive`, `updatedAt`) must use server time.

## The "Dirty Dozen" Payloads (Deny Access)
1. **Identity Spoofing**: Attempting to create a `userProgress` document with a `userId` that doesn't match `request.auth.uid`.
2. **Privilege Escalation**: Attempting to set `isPublic: true` (or any admin-only field) when not authorized.
3. **Ghost Field Injection**: Adding an unallowed field like `isAdmin: true` to a `userProgress` update.
4. **ID Poisoning**: Using a 1MB string as a document ID for `savedWords`.
5. **State Shortcutting**: Manually incrementing points in `userProgress` by 1,000,000 in one update.
6. **Zero-Trust Bypass**: Attempting to read another user's `savedWords` collection without a filter.
7. **Timestamp Fraud**: Providing a client-side date for `createdAt` instead of `request.time`.
8. **Null Poisoning**: Setting `displayName` to a number or a 1MB string.
9. **Orphaned Writes**: Creating a `savedWord` for a `userId` that has no `userProgress` or `users` record.
10. **Type Confusion**: Sending a `list` for the `points` field instead of an `int`.
11. **Negative Drain**: Attempting to set `points` to `-50`.
12. **Shadow Update**: Updating `userId` on a `savedWord` document after creation.

## Test Strategy
All payloads above must return `PERMISSION_DENIED`.
Rules will be validated using `@firebase/eslint-plugin-security-rules`.
