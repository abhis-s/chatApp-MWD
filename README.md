# Realtime Chat Application — Domain Models

## Domain Classes (`shared/`)

- [`User.ts`](shared/User.ts): User identity, role permissions (`admin` / `user`), presence (`setOnline`), avatars (`setAvatar`), serialization (`toJSON` / `fromJSON`).
- [`Room.ts`](shared/Room.ts): Room entity, participant management (`addParticipant`, `removeParticipant`, `hasParticipant`, `getParticipantCount`).
- [`Message.ts`](shared/Message.ts): Scoped message payload, sender info, avatar, timestamp formatting.
- [`Ban.ts`](shared/Ban.ts): Moderation entity, room and global bans (`isBanned`), client storage export (`toClientStorage`).

## Extensions

1. **User Avatars & Presence:** Selectable avatar identifiers and online/offline state across `User` and `Message`.
2. **Moderation & Room Bans:** Scoped ban records in `Ban` with local storage export and enforcement checks.

## Commands

```bash
pnpm run demo       # Run demonstration script
pnpm run typecheck  # TypeScript check (tsc --noEmit)
pnpm run build      # Compile to ./dist
```
