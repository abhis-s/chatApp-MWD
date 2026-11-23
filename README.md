# Realtime Chat Application

## Domain Classes (`shared/`)

- [`User.ts`](shared/User.ts): User identity, role check (`isAdmin`), presence (`setOnline`), avatars (`setAvatar`), serialization (`toJSON` / `fromJSON`).
- [`Room.ts`](shared/Room.ts): Room entity, participant management (`addParticipant`, `removeParticipant`, `hasParticipant`, `getParticipantCount`).
- [`Message.ts`](shared/Message.ts): Scoped message payload, sender info, avatar, timestamp formatting (`getFormattedTimestamp`).
- [`Ban.ts`](shared/Ban.ts): Moderation entity, room and global bans (`isBanned`), client storage export (`toClientStorage`).

## Extensions

1. **User Avatars & Presence:** Selectable avatar identifiers and online/offline state across `User` and `Message`.
2. **Moderation & Room Bans:** Scoped ban records in `Ban` with local storage export and enforcement checks.

## Running locally

Install dependencies, then run the backend and Angular development server in separate terminals:

```bash
pnpm install
```

Terminal 1:

```bash
pnpm run start:server
```

Terminal 2:

```bash
pnpm start
```

Angular is available at `http://localhost:4200/`; the HTTP API and WebSocket server listen on `http://localhost:3333/` and `ws://localhost:3333/chat`. Stop each process with `Ctrl+C` in its terminal. The Angular app currently shows the starter page and is not connected to the backend.

## Server (`server/index.ts`)

Combined Express HTTP API and `ws` WebSocket server on port `3333` (`PORT` env). State persists to `data/chat.json` (`CHAT_DATA_FILE` env); online presence is tracked in memory. The first created user is assigned the `admin` role.

```bash
pnpm run typecheck          # Check server and Angular application
pnpm run build              # Build server and Angular app to ./dist
pnpm run start:server:build # Run the compiled server after building
```

## Angular

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.7. The development server automatically reloads when you modify source files.

### Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
pnpm exec ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
pnpm exec ng generate --help
```

### Building

To build the project run:

```bash
pnpm run build:client
```

This builds the Angular application into `dist/chatApp-MWD`. Use `pnpm run build` to build both the server and Angular.

## Server HTTP API

| Endpoint | Body / Description |
| --- | --- |
| `POST /api/login` | `{ "username": "Alice" }` — returns existing or new user (`avatar` defaults to `'default'`). |
| `GET /api/users` | Lists all users and current online status. |
| `PATCH /api/users/:userId` | `{ "avatar": "fox" }` — updates the user's avatar. |
| `GET /api/rooms` | Lists all rooms and saved `participantIds`. |
| `POST /api/rooms` | `{ "name": "General", "adminId": "USER_ID" }` — creates a room (admin only). |
| `POST /api/rooms/:roomId/join` | `{ "userId": "USER_ID" }` — adds user to room (`403` with `ban` payload if banned). |
| `GET /api/rooms/:roomId/messages?userId=USER_ID` | Returns room message history (room member or admin). |
| `POST /api/rooms/:roomId/messages` | `{ "userId": "USER_ID", "text": "Hello" }` — saves and broadcasts a message. |
| `GET /api/bans?adminId=USER_ID` | Lists active bans (admin only). |
| `POST /api/bans` | `{ "adminId": "USER_ID", "username": "Alice", "roomId": "ROOM_ID", "reason": "Spam" }` — bans user (`roomId` defaults to `'GLOBAL'`), removes them from saved participants, and disconnects active sockets. |

### WebSocket Protocol (`ws://localhost:3333/chat`)

Join a room via `POST /api/rooms/:roomId/join` before connecting its WebSocket.

| Direction | Event Payload | Description |
| --- | --- | --- |
| Client -> Server | `{ "type": "join", "userId": "USER_ID", "roomId": "ROOM_ID" }` | Subscribes socket to room and marks user online. |
| Client -> Server | `{ "type": "message", "text": "Hello" }` | Sends a message to the joined room. |
| Server -> Client | `{ "type": "joined", "roomId": "ROOM_ID", "userId": "USER_ID" }` | Confirms room subscription to the sender. |
| Server -> Client | `{ "type": "participants", "roomId": "ROOM_ID", "participantIds": ["..."] }` | Broadcasts currently connected user IDs in the room. |
| Server -> Client | `{ "type": "message", "message": { ... } }` | Broadcasts a new message to all connected room sockets. |
| Server -> Client | `{ "type": "banned", "ban": { ... } }` | Sent with `Ban.toClientStorage()` payload before closing (`1008`). |
| Server -> Client | `{ "type": "error", "error": "..." }` | Reports an invalid request or permission error. |

## Postman Test Flow

1. Start the backend with `pnpm run start:server`.
2. `POST /api/login` for `Admin`, `Alice`, and `Bob`; optionally call `PATCH /api/users/ALICE_ID` with `{"avatar":"fox"}`.
3. `POST /api/rooms` with `{"name":"General","adminId":"ADMIN_ID"}`.
4. `POST /api/rooms/ROOM_ID/join` for `ALICE_ID` and `BOB_ID`.
5. Connect two Postman WebSocket tabs to `ws://localhost:3333/chat` and send `{"type":"join","userId":"...","roomId":"ROOM_ID"}` in each.
6. Send `{"type":"message","text":"Hi Bob!"}` on Alice's socket and verify broadcast on both tabs.
7. Check `GET /api/rooms/ROOM_ID/messages?userId=ADMIN_ID` (silent admin monitoring) and `POST /api/bans` to verify live socket disconnect.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
pnpm test
```

## Running end-to-end tests

An end-to-end testing framework has not been configured.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
