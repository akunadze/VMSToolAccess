import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { UserData, LogEntryData } from '@/types'

async function fetchUsers(): Promise<UserData[]> {
    const resp = await fetch('/api/users');
    if (!resp.ok) throw new Error('Failed to fetch users');
    const json = await resp.json();
    return json.data;
}

export function useUsers() {
    const { data } = useQuery({
        queryKey: ['users'],
        queryFn: fetchUsers,
        staleTime: Infinity,
    });

    const users = computed(() => data.value ?? []);

    function findUser(id: number): UserData | undefined {
        return users.value.find(u => u.id === id);
    }

    function getUserFullName(id: number): string {
        return findUser(id)?.fullName ?? '<user not found>';
    }

    function getLogEntryDisplayName(entry: LogEntryData): string {
        const user = findUser(entry.userId);
        return user ? user.fullName : 'Card #' + entry.card;
    }

    return { users, findUser, getUserFullName, getLogEntryDisplayName };
}
