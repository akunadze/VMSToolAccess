export interface LastSeen {
  toolMac: string;
  timestamp: number;
  updated: boolean;
  offline: boolean;
  version?: number;
}

export const watchdog: LastSeen[] = [];
export let latestVersion = 0;
export function setLatestVersion(v: number) { latestVersion = v; }
