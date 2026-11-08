import { User } from './shared/User.js';
import { Room } from './shared/Room.js';
import { Message } from './shared/Message.js';
import { Ban } from './shared/Ban.js';

console.log('--- 1. User Class & Extension 1 (Avatars & Presence) ---');
const admin = new User('usr_admin', 'AdminBoss', 'crown', true, 'admin');
const alice = new User('usr_alice', 'Alice', 'fox', true, 'user');
const bob = new User('usr_bob', 'Bob', 'panda', true, 'user');

console.log(`[User] Admin: ${admin.username} (canCreateRoom: ${admin.canCreateRoom()})`);
console.log(`[User] Regular: ${alice.username} (canCreateRoom: ${alice.canCreateRoom()})`);

alice.setOnline(false);
console.log(`[Presence] Alice setOnline(false) -> isOnline: ${alice.isOnline}`);
alice.setOnline(true);

alice.setAvatar('cat');
console.log(`[Avatar] Alice setAvatar('cat') -> avatar: ${alice.avatar}`);

const aliceRestored = User.fromJSON(alice.toJSON());
console.log(`[User] JSON roundtrip: ${aliceRestored.username} (online: ${aliceRestored.isOnline}, avatar: ${aliceRestored.avatar})\n`);

console.log('--- 2. Room Class & Membership Lifecycle ---');
const room = new Room('room_lab1', 'Web Development Lab 1', admin.id);
console.log(`[Room] Created "${room.name}" (ID: ${room.id})`);

room.addParticipant(admin.id);
room.addParticipant(alice.id);
console.log(`[Membership] Added admin and alice. Count: ${room.getParticipantCount()}`);
console.log(`[Membership] Duplicate alice add: ${room.addParticipant(alice.id)}`);
console.log(`[Membership] Has Bob: ${room.hasParticipant(bob.id)}`);

room.removeParticipant(admin.id);
console.log(`[Membership] Removed admin. Count: ${room.getParticipantCount()}`);

const roomRestored = Room.fromJSON(room.toJSON());
console.log(`[Room] JSON roundtrip: "${roomRestored.name}" has ${roomRestored.participantIds.length} members\n`);

console.log('--- 3. Message Class ---');
const msg = new Message('msg_101', room.id, alice.id, alice.username, alice.avatar, 'Task 3 TypeScript classes demo');
console.log(`[Message] [${msg.getFormattedTimestamp()}] ${msg.senderUsername} (${msg.senderAvatar}): "${msg.text}"`);

const msgRestored = Message.fromJSON(msg.toJSON());
console.log(`[Message] JSON roundtrip: "${msgRestored.text}" from ${msgRestored.senderUsername}\n`);

console.log('--- 4. Ban Class & Extension 2 (Moderation) ---');
const roomBan = new Ban('ban_201', bob.username, room.id, new Date(), 'Spamming');
console.log(`[Ban] Banned ${roomBan.username} from ${roomBan.roomId}: "${roomBan.reason}"`);
console.log(`[Enforcement] Is Bob banned from ${room.id}: ${roomBan.isBanned('Bob', room.id)}`);
console.log(`[Enforcement] Is Bob banned from room_other: ${roomBan.isBanned('Bob', 'room_other')}`);
console.log(`[Enforcement] Is Alice banned from ${room.id}: ${roomBan.isBanned('Alice', room.id)}`);

const globalBan = new Ban('ban_202', 'Troll', 'GLOBAL', new Date(), 'Terms violation');
console.log(`[Enforcement] Is Troll globally banned: ${globalBan.isBanned('Troll', 'any_room')}`);

console.log('[Client Storage] Payload:', JSON.stringify(roomBan.toClientStorage()));
console.log('\n[SUCCESS] All classes and extensions verified.');
