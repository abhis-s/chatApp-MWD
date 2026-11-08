export class Message {
    public id: string;
    public roomId: string;
    public senderId: string;
    public senderUsername: string;
    public senderAvatar: string;
    public text: string;
    public timestamp: Date;

    constructor(
        id: string,
        roomId: string,
        senderId: string,
        senderUsername: string,
        senderAvatar: string,
        text: string,
        timestamp: Date = new Date()
    ) {
        this.id = id;
        this.roomId = roomId;
        this.senderId = senderId;
        this.senderUsername = senderUsername;
        this.senderAvatar = senderAvatar;
        this.text = text;
        this.timestamp = timestamp instanceof Date ? timestamp : new Date(timestamp);
    }

    public getFormattedTimestamp(): string {
        return this.timestamp.toLocaleTimeString();
    }

    public toJSON(): Record<string, any> {
        return {
            id: this.id,
            roomId: this.roomId,
            senderId: this.senderId,
            senderUsername: this.senderUsername,
            senderAvatar: this.senderAvatar,
            text: this.text,
            timestamp: this.timestamp.toISOString(),
            formattedTime: this.getFormattedTimestamp()
        };
    }

    public static fromJSON(json: Record<string, any>): Message {
        return new Message(
            json.id,
            json.roomId,
            json.senderId,
            json.senderUsername,
            json.senderAvatar,
            json.text,
            new Date(json.timestamp)
        );
    }
}
