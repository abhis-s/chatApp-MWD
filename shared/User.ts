export type UserRole = 'admin' | 'user';

export class User {
    public id: string;
    public username: string;
    public avatar: string;
    public isOnline: boolean;
    public role: UserRole;

    constructor(
        id: string,
        username: string,
        avatar: string = 'default',
        isOnline: boolean = true,
        role: UserRole = 'user'
    ) {
        this.id = id;
        this.username = username;
        this.avatar = avatar;
        this.isOnline = isOnline;
        this.role = role;
    }

    public setOnline(status: boolean): void {
        this.isOnline = status;
    }

    public setAvatar(avatar: string): void {
        this.avatar = avatar;
    }

    public canCreateRoom(): boolean {
        return this.role === 'admin';
    }

    public toJSON(): Record<string, any> {
        return {
            id: this.id,
            username: this.username,
            avatar: this.avatar,
            isOnline: this.isOnline,
            role: this.role
        };
    }

    public static fromJSON(json: Record<string, any>): User {
        return new User(
            json.id,
            json.username,
            json.avatar,
            json.isOnline,
            json.role
        );
    }
}
