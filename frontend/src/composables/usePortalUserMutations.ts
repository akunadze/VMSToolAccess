import { useMutation, useQueryClient } from '@tanstack/vue-query'

export function usePortalUserMutations() {
    const queryClient = useQueryClient();

    const addPortalUser = useMutation({
        mutationFn: async ({ name, password }: { name: string; password: string }) => {
            const resp = await fetch('/api/portaluser/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, password })
            });
            const json = await resp.json();
            if (resp.status !== 200 || json.error) throw new Error(json.error ?? 'Failed to add portal user');
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portalUsers'] }),
    });

    const editPortalUser = useMutation({
        mutationFn: async ({ id, name, password }: { id: number; name: string; password: string }) => {
            const resp = await fetch('/api/portaluser/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, name, password })
            });
            const json = await resp.json();
            if (resp.status !== 200 || json.error) throw new Error(json.error ?? 'Failed to edit portal user');
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portalUsers'] }),
    });

    const deletePortalUser = useMutation({
        mutationFn: async (userId: number) => {
            const resp = await fetch('/api/portaluser/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId })
            });
            const json = await resp.json();
            if (resp.status !== 200 || json.error) throw new Error(json.error ?? 'Failed to delete portal user');
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portalUsers'] }),
    });

    return { addPortalUser, editPortalUser, deletePortalUser };
}
