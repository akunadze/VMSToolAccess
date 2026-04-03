import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { PortalUserData } from '@/types'

async function fetchPortalUsers(): Promise<PortalUserData[]> {
    const resp = await fetch('/api/portalusers');
    if (!resp.ok) throw new Error('Failed to fetch portal users');
    const json = await resp.json();
    return json.data;
}

export function usePortalUsers() {
    const { data } = useQuery({
        queryKey: ['portalUsers'],
        queryFn: fetchPortalUsers,
        staleTime: Infinity,
    });

    const portalUsers = computed(() => data.value ?? []);

    function findPortalUser(id: number): PortalUserData | undefined {
        return portalUsers.value.find(u => u.id === id);
    }

    function getPortalUsername(id: number): string {
        return findPortalUser(id)?.name ?? '';
    }

    return { portalUsers, findPortalUser, getPortalUsername };
}
