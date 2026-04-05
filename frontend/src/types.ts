export interface LogEntryData {
    userId: number;
    timestamp: number;
    op: string;
    card: string;
    spindleTime: number;
}

export interface ToolData {
    id: number;
    name: string;
    users: number[];
    lastEntry?: LogEntryData;
    currentUserId: number;
    mac: string;
    offline: boolean;
    utilization: number;
    isLocked: boolean;
    spindleTime: number;
    version?: number;
}

export interface UserData {
    id: number;
    fullName: string;
    email: string;
    card: string;
    doorCard: string;
    group: boolean;
    members: number[];
}

export interface PortalUserData {
    id: number;
    name: string;
    password: string;
}

export function formatSeconds(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    return `${formattedHours}h ${formattedMinutes}m ${formattedSeconds}s`;
}
