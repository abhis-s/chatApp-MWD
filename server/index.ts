import express from 'express';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import { User } from '../shared/User.js';
import { Room } from '../shared/Room.js';
import { Message } from '../shared/Message.js';
import { Ban } from '../shared/Ban.js';

// One file stores durable data, including room membership. Online status is rebuilt on connection.
const dataFile = resolve(process.env.CHAT_DATA_FILE || 'data/chat.json');
type Data = { users: User[]; rooms: Room[]; messages: Message[]; bans: Ban[] };
// Restore saved objects as model instances, or start with empty lists on the first run.
// Connections do not survive a restart, so users start offline.
function load(): Data {
    if (!existsSync(dataFile)) return { users: [], rooms: [], messages: [], bans: [] };
    const data = JSON.parse(readFileSync(dataFile, 'utf8'));
    return {
        users: data.users.map((item: any) => { const user = User.fromJSON(item); user.setOnline(false); return user; }),
        rooms: data.rooms.map((item: any) => Room.fromJSON(item)),
        messages: data.messages.map((item: any) => Message.fromJSON(item)),
        bans: data.bans.map((item: any) => Ban.fromJSON(item))
    };
}
const data = load();
// Write the current data to JSON, creating the parent directory if needed.
function save(): void {
    mkdirSync(dirname(dataFile), { recursive: true });
    writeFileSync(dataFile, JSON.stringify(data, null, 2) + '\n');
}
const app = express();
// Log each HTTP request's method, URL, response status and duration.
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`));
    next();
});
app.use(express.json());
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/chat' });
type Connection = { user: User; room: Room };
const connections = new Map<WebSocket, Connection>();
// Look up the user or room identified by a client request.
const findUser = (id: unknown) => data.users.find(user => user.id === id);
const findRoom = (id: unknown) => data.rooms.find(room => room.id === id);
// Check whether a global ban or a ban for this room applies to the user.
const banned = (user: User, room: Room) => data.bans.some(ban => ban.isBanned(user.username, room.id));
// Send a JSON event to every open WebSocket currently joined to this room.
function broadcast(room: Room, event: object): void {
    const payload = JSON.stringify(event);
    for (const [socket, connection] of connections) {
        if (connection.room.id === room.id && socket.readyState === WebSocket.OPEN) socket.send(payload);
    }
}
// Tell connected room members which user IDs currently have a connection to the room.
function presence(room: Room): void {
    const participantIds = [...new Set([...connections.values()].filter(c => c.room.id === room.id).map(c => c.user.id))];
    broadcast(room, { type: 'participants', roomId: room.id, participantIds });
}
// Remove a socket from its room and update presence, accounting for multiple connections per user.
function leave(socket: WebSocket): void {
    const connection = connections.get(socket);
    if (!connection) return;
    connections.delete(socket);
    const { user, room } = connection;
    user.setOnline([...connections.values()].some(c => c.user.id === user.id));
    presence(room);
}
// Create and save a message, then broadcast it to the room and return it to the caller.
function createMessage(user: User, room: Room, text: string): Message {
    const message = new Message(randomUUID(), room.id, user.id, user.username, user.avatar, text.trim());
    data.messages.push(message);
    save();
    broadcast(room, { type: 'message', message });
    return message;
}
// Accept only strings containing at least one non-whitespace character.
const validText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

// Find or create a user by username; the first user is an admin. This is not password authentication.
app.post('/api/login', (req, res) => {
    const { username, avatar } = req.body ?? {};
    if (!validText(username)) { res.status(400).json({ error: 'username is required' }); return; }
    let user = data.users.find(item => item.username.toLowerCase() === username.trim().toLowerCase());
    if (!user) {
        user = new User(randomUUID(), username.trim(), validText(avatar) ? avatar.trim() : 'default', false, data.users.length === 0 ? 'admin' : 'user');
        data.users.push(user);
        save();
    }
    res.json(user);
});
// Return all users, including their current online status.
app.get('/api/users', (_req, res) => res.json(data.users));
// Return the available rooms and their saved members.
app.get('/api/rooms', (_req, res) => res.json(data.rooms));
// Let an admin create a room with a non-empty name.
app.post('/api/rooms', (req, res) => {
    const { name, adminId } = req.body ?? {};
    const admin = findUser(adminId);
    if (!admin?.canCreateRoom()) { res.status(403).json({ error: 'admin required' }); return; }
    if (!validText(name)) { res.status(400).json({ error: 'name is required' }); return; }
    const room = new Room(randomUUID(), name.trim(), admin.id);
    data.rooms.push(room); save(); res.status(201).json(room);
});
// Add an existing user to a room and save their membership, unless they are banned.
app.post('/api/rooms/:roomId/join', (req, res) => {
    const room = findRoom(req.params.roomId);
    const user = findUser(req.body?.userId);
    if (!room || !user) { res.status(404).json({ error: 'room or user not found' }); return; }
    if (banned(user, room)) { res.status(403).json({ error: 'user is banned from this room' }); return; }
    if (room.addParticipant(user.id)) save();
    res.json(room);
});
// Return saved messages only to a room member who is not banned.
app.get('/api/rooms/:roomId/messages', (req, res) => {
    const room = findRoom(req.params.roomId);
    const user = findUser(req.query.userId);
    if (!room || !user) { res.status(404).json({ error: 'room or user not found' }); return; }
    if (banned(user, room) || !room.hasParticipant(user.id)) { res.status(403).json({ error: 'room membership required and user must not be banned' }); return; }
    res.json(data.messages.filter(message => message.roomId === req.params.roomId));
});
// Validate and save an HTTP message, then broadcast it to the room's WebSocket clients.
app.post('/api/rooms/:roomId/messages', (req, res) => {
    const room = findRoom(req.params.roomId);
    const user = findUser(req.body?.userId);
    if (!room || !user) { res.status(404).json({ error: 'room or user not found' }); return; }
    if (banned(user, room)) { res.status(403).json({ error: 'user is banned from this room' }); return; }
    if (!room.hasParticipant(user.id)) { res.status(403).json({ error: 'join the room first' }); return; }
    if (!validText(req.body?.text)) { res.status(400).json({ error: 'text is required' }); return; }
    res.status(201).json(createMessage(user, room, req.body.text));
});
// Let an admin ban a user globally or from one room and disconnect affected sockets.
app.post('/api/bans', (req, res) => {
    const { adminId, username, roomId = 'GLOBAL', reason } = req.body ?? {};
    if (!findUser(adminId)?.canCreateRoom()) { res.status(403).json({ error: 'admin required' }); return; }
    if (!validText(username) || !data.users.some(user => user.username.toLowerCase() === username.trim().toLowerCase())) { res.status(400).json({ error: 'existing username is required' }); return; }
    if (roomId !== 'GLOBAL' && !findRoom(roomId)) { res.status(404).json({ error: 'room not found' }); return; }
    const ban = new Ban(randomUUID(), username.trim(), roomId, new Date(), validText(reason) ? reason.trim() : undefined);
    data.bans.push(ban); save();
    for (const [socket, connection] of connections) {
        if (ban.isBanned(connection.user.username, connection.room.id)) {
            socket.send(JSON.stringify({ type: 'banned', ban }));
            leave(socket);
            socket.close(1008, 'Banned from room');
        }
    }
    res.status(201).json(ban);
});
// Return a JSON 404 response for routes that do not match an API endpoint.
app.use((_req, res) => res.status(404).json({ error: 'route not found' }));

// Register handlers for each new WebSocket connection.
wss.on('connection', socket => {
    // Process JSON events sent by this socket and report invalid requests to the client.
    socket.on('message', raw => {
        try {
            const event = JSON.parse(raw.toString());
            if (!event || typeof event !== 'object') throw new Error('Expected a JSON object');
            if (event.type === 'join') {
                // Check membership before subscribing this socket to live room events.
                const user = findUser(event.userId);
                const room = findRoom(event.roomId);
                if (!user || !room) throw new Error('room or user not found');
                if (banned(user, room)) throw new Error('user is banned from this room');
                if (!room.hasParticipant(user.id)) throw new Error('join the room through the HTTP API first');
                leave(socket);
                connections.set(socket, { user, room });
                user.setOnline(true);
                socket.send(JSON.stringify({ type: 'joined', roomId: room.id, userId: user.id }));
                presence(room);
            } else if (event.type === 'message') {
                // Only a joined, non-banned user can send a message to their current room.
                const connection = connections.get(socket);
                if (!connection) throw new Error('join a room first');
                if (banned(connection.user, connection.room)) throw new Error('user is banned from this room');
                if (!validText(event.text)) throw new Error('text is required');
                createMessage(connection.user, connection.room, event.text);
            } else throw new Error('unknown event type');
        } catch (error) {
            socket.send(JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'invalid event' }));
        }
    });
    // Clean up presence when the socket closes and log any socket errors.
    socket.on('close', () => leave(socket));
    socket.on('error', error => console.error('WebSocket error:', error.message));
});
const port = Number(process.env.PORT || 3333);
// Start the HTTP and WebSocket server on the same port.
server.listen(port, () => console.log(`Chat server listening on http://localhost:${port}`));
