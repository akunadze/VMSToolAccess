import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { LogEntryData } from '@/types'

export function useToolMutations() {
    const queryClient = useQueryClient();

    const setToolLockout = useMutation({
        mutationFn: async ({ toolId, lockout }: { toolId: number; lockout: boolean }) => {
            const resp = await fetch('/api/tool/setlockout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: toolId, islocked: lockout })
            });
            const json = await resp.json();
            if (resp.status !== 200 || json.error) throw new Error(json.error ?? 'Failed to set lockout');
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tools'] }),
    });

    const editToolName = useMutation({
        mutationFn: async ({ toolId, name }: { toolId: number; name: string }) => {
            const resp = await fetch('/api/tool/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toolId, toolName: name })
            });
            const json = await resp.json();
            if (resp.status !== 200 || json.error) throw new Error(json.error ?? 'Failed to edit tool name');
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tools'] }),
    });

    const editToolUsers = useMutation({
        mutationFn: async ({ toolId, userIds }: { toolId: number; userIds: number[] }) => {
            const resp = await fetch('/api/tool/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toolId, toolUsers: userIds })
            });
            const json = await resp.json();
            if (resp.status !== 200 || json.error) throw new Error(json.error ?? 'Failed to edit tool users');
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tools'] }),
    });

    const setCheckoutUsers = useMutation({
        mutationFn: async ({ toolId, userIds }: { toolId: number; userIds: number[] }) => {
            const resp = await fetch(`/api/tools/${toolId}/set-checkout-users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds })
            });
            const json = await resp.json();
            if (resp.status !== 200 || json.error) throw new Error(json.error ?? 'Failed to set checkout users');
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checkoutUsers'] }),
    });

    return { setToolLockout, editToolName, editToolUsers, setCheckoutUsers };
}

export function useToolCheckoutUsers(toolId: number) {
    return useQuery({
        queryKey: ['checkoutUsers', toolId],
        queryFn: async () => {
            const resp = await fetch(`/api/tools/${toolId}/checkout-users`);
            const json = await resp.json();
            if (!resp.ok || json.error) throw new Error(json.error ?? 'Failed to fetch checkout users');
            return json.data as number[];
        },
        staleTime: Infinity,
    });
}

export function useToolTopUsers(toolId: number) {
    return useQuery({
        queryKey: ['toolTopUsers', toolId],
        queryFn: async () => {
            const resp = await fetch('/api/tools/topusers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toolId })
            });
            const json = await resp.json();
            if (!resp.ok || json.error) throw new Error(json.error ?? 'Failed to fetch top users');
            return json.data as { userId: number; userTotal: number; spindleTime: number }[];
        },
        staleTime: Infinity,
    });
}

export function useUserTopTools(userId: number) {
    return useQuery({
        queryKey: ['userTopTools', userId],
        queryFn: async () => {
            const resp = await fetch('/api/users/toptools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            const json = await resp.json();
            if (!resp.ok || json.error) throw new Error(json.error ?? 'Failed to fetch top tools');
            return json.data as { toolId: number; totalTime: number; totalSpindleTime: number }[];
        },
        staleTime: Infinity,
    });
}

export function useToolLog(toolId: number) {
    return useQuery({
        queryKey: ['toolLog', toolId],
        queryFn: async () => {
            const resp = await fetch(`/api/tools/${toolId}/log`);
            const json = await resp.json();
            if (!resp.ok || json.error) throw new Error(json.error ?? 'Failed to fetch tool log');
            return json.data as LogEntryData[];
        },
        staleTime: Infinity,
    });
}
