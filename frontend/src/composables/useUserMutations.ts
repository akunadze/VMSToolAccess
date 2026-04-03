import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { UserData } from '@/types'

export function useUserMutations() {
    const queryClient = useQueryClient();

    const addUser = useMutation({
        mutationFn: async (user: UserData) => {
            const resp = await fetch('/api/user/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: user.fullName, email: user.email, card: user.card, doorCard: user.doorCard, members: user.group ? user.members : undefined })
            });
            const json = await resp.json();
            if (resp.status !== 200 || json.error) throw new Error(json.error ?? 'Failed to add user');
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    });

    const editUser = useMutation({
        mutationFn: async (user: UserData) => {
            const resp = await fetch('/api/user/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: user.id, name: user.fullName, email: user.email, card: user.card, doorCard: user.doorCard, members: user.members })
            });
            const json = await resp.json();
            if (resp.status !== 200 || json.error) throw new Error(json.error ?? 'Failed to edit user');
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    });

    const deleteUser = useMutation({
        mutationFn: async (userId: number) => {
            const resp = await fetch('/api/user/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId })
            });
            const json = await resp.json();
            if (resp.status !== 200 || json.error) throw new Error(json.error ?? 'Failed to delete user');
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    });

    return { addUser, editUser, deleteUser };
}
