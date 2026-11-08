export class Room {
    public id: string;
    public name: string;
    public createdByAdminId: string;
    public createdAt: Date;
    public participantIds: string[];

    constructor(
        id: string,
        name: string,
        createdByAdminId: string,
        createdAt: Date = new Date(),
        participantIds: string[] = []
    ) {
        this.id = id;
        this.name = name;
        this.createdByAdminId = createdByAdminId;
        this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
        this.participantIds = [...participantIds];
    }

    public addParticipant(userId: string): boolean {
        if (!this.hasParticipant(userId)) {
            this.participantIds.push(userId);
            return true;
        }
        return false;
    }

    public removeParticipant(userId: string): boolean {
        const index = this.participantIds.indexOf(userId);
        if (index !== -1) {
            this.participantIds.splice(index, 1);
            return true;
        }
        return false;
    }

    public hasParticipant(userId: string): boolean {
        return this.participantIds.includes(userId);
    }

    public getParticipantCount(): number {
        return this.participantIds.length;
    }

    public toJSON(): Record<string, any> {
        return {
            id: this.id,
            name: this.name,
            createdByAdminId: this.createdByAdminId,
            createdAt: this.createdAt.toISOString(),
            participantIds: this.participantIds,
            participantCount: this.participantIds.length
        };
    }

    public static fromJSON(json: Record<string, any>): Room {
        return new Room(
            json.id,
            json.name,
            json.createdByAdminId,
            new Date(json.createdAt),
            json.participantIds || []
        );
    }
}
