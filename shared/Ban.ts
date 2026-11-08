export class Ban {
    public id: string;
    public username: string;
    public roomId: string;
    public bannedAt: Date;
    public reason: string;

    constructor(
        id: string,
        username: string,
        roomId: string = 'GLOBAL',
        bannedAt: Date = new Date(),
        reason: string = 'Violation of chat rules'
    ) {
        this.id = id;
        this.username = username;
        this.roomId = roomId;
        this.bannedAt = bannedAt instanceof Date ? bannedAt : new Date(bannedAt);
        this.reason = reason;
    }

    public isBanned(username: string, roomId?: string): boolean {
        const matchesUser = this.username.toLowerCase() === username.toLowerCase();
        if (!matchesUser) return false;
        if (this.roomId === 'GLOBAL') return true;
        return roomId ? this.roomId === roomId : true;
    }

    public toClientStorage(): Record<string, any> {
        return {
            banId: this.id,
            username: this.username,
            roomId: this.roomId,
            bannedAt: this.bannedAt.toISOString(),
            reason: this.reason
        };
    }

    public toJSON(): Record<string, any> {
        return {
            id: this.id,
            username: this.username,
            roomId: this.roomId,
            bannedAt: this.bannedAt.toISOString(),
            reason: this.reason
        };
    }

    public static fromJSON(json: Record<string, any>): Ban {
        return new Ban(
            json.id,
            json.username,
            json.roomId,
            new Date(json.bannedAt),
            json.reason
        );
    }
}
