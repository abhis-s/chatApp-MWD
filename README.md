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

## Chat server

The server uses Express and the `ws` WebSocket library on the same HTTP server, as shown in the lecture. It uses the shared classes above and saves users, rooms, messages and bans in `data/chat.json`. The file is created on the first change and is ignored by Git. Room membership is saved; online presence is held in memory and resets after a restart.

```bash
pnpm install
pnpm start              # HTTP and WebSocket on port 3333
pnpm run build          # compile TypeScript
pnpm run start:build    # run compiled server
```

Set `PORT` to change the port, or `CHAT_DATA_FILE` to choose another JSON file. Run the commands from the project directory.

### HTTP API

All POST bodies are JSON. Responses are JSON too. IDs in the examples come from previous responses.

| Method and path | Body / result |
| --- | --- |
| `POST /api/login` | `{ "username": "Alice", "avatar": "fox" }` returns an existing or new user. Avatar is optional. |
| `GET /api/users` | List users and their current online status. |
| `GET /api/rooms` | List rooms and their saved members. |
| `POST /api/rooms` | `{ "name": "General", "adminId": "USER_ID" }` creates a room. |
| `POST /api/rooms/ROOM_ID/join` | `{ "userId": "USER_ID" }` adds a user to the room. Joining again is safe. |
| `GET /api/rooms/ROOM_ID/messages?userId=USER_ID` | Get saved messages as a room member. |
| `POST /api/rooms/ROOM_ID/messages` | `{ "userId": "USER_ID", "text": "Hello" }` saves and broadcasts a message. |
| `POST /api/bans` | `{ "adminId": "USER_ID", "username": "Alice", "roomId": "ROOM_ID", "reason": "Spam" }` bans a user. Omit `roomId` for a global ban; `reason` is optional. |

The first user created is an admin; subsequent users are ordinary users. Login is deliberately just a username lookup, with no passwords or sessions. IDs are supplied by the client, so admin checks and bans are useful for a classroom demo but do **not** provide real authentication or security. Use a trusted environment. A ban disconnects matching active sockets and blocks subsequent messages and room joins.

For a quick HTTP demo:

```bash
curl -X POST http://localhost:3333/api/login -H 'Content-Type: application/json' -d '{"username":"Admin"}'
curl -X POST http://localhost:3333/api/rooms -H 'Content-Type: application/json' -d '{"name":"General","adminId":"USER_ID_FROM_LOGIN"}'
curl http://localhost:3333/api/rooms
```

### Test with Postman

1. Start the server with `pnpm start`. Send `POST /api/login` with `{"username":"Admin"}`, then repeat for `Alice` and `Bob`. Copy each returned `id`. On a fresh data file, the first user is the admin; if users already exist, find the admin with `GET /api/users`.
2. Send `POST /api/rooms` with `{"name":"General","adminId":"ADMIN_ID"}` and copy the returned room `id`. Replace the example IDs in the following steps with the actual IDs.
3. Send `POST /api/rooms/ROOM_ID/join` with `{"userId":"ALICE_ID"}`, then repeat with Bob's ID. Both users are now saved as room members.
4. Open two WebSocket requests in Postman and connect each to `ws://localhost:3333/chat`. On Alice's connection, send `{"type":"join","userId":"ALICE_ID","roomId":"ROOM_ID"}`. Repeat on Bob's connection using his ID. Both should receive a `participants` event when Bob connects.
5. Send `{"type":"message","text":"Hi Bob!"}` from Alice's connection. Both connections should receive the `message` event. Send a reply from Bob to check delivery in the other direction.
6. Request `GET /api/rooms/ROOM_ID/messages?userId=ALICE_ID` to see the saved history. After restarting the server, membership and history remain; each user must reconnect their WebSocket for live updates.

### WebSocket protocol

First join the room using the HTTP endpoint above. Then connect to `ws://localhost:3333/chat` with a browser's native `WebSocket`. Send `{ "type": "join", "userId": "USER_ID", "roomId": "ROOM_ID" }`. The server replies with `joined` and broadcasts a `participants` event to that room. After joining, send `{ "type": "message", "text": "Hello" }`; everyone in that room, including the sender, receives `{ "type": "message", "message": { ... } }`. HTTP-created messages generate the same event. Invalid requests receive `{ "type": "error", "error": "..." }`. A banned client receives a `banned` event and its socket closes. Closing a socket updates online participants and user presence, but saved room membership remains; one user can have multiple connections. The `participants` event lists connected users, whereas the room’s `participantIds` lists saved members.

```js
const socket = new WebSocket('ws://localhost:3333/chat');
socket.onopen = () => socket.send(JSON.stringify({ type: 'join', userId: 'USER_ID', roomId: 'ROOM_ID' }));
socket.onmessage = event => console.log(JSON.parse(event.data));
// After the connection is open and the join has succeeded:
// socket.send(JSON.stringify({ type: 'message', text: 'Hello!' }));
```
