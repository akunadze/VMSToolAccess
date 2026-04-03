import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'

export function useAuth() {
    const queryClient = useQueryClient();
    const auth = useAuthStore();

    const login = useMutation({
        mutationFn: async ({ user, password }: { user: string; password: string }) => {
            const resp = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user, password })
            });
            const json = await resp.json();
            if (resp.status !== 200 || json.error || !json.data?.id) return 0;
            return json.data.id as number;
        },
        onSuccess: (id: number) => {
            auth.setLoggedIn(id);
            if (id > 0) {
                queryClient.invalidateQueries({ queryKey: ['users'] });
                queryClient.invalidateQueries({ queryKey: ['tools'] });
                queryClient.invalidateQueries({ queryKey: ['portalUsers'] });
            }
        },
    });

    const logout = useMutation({
        mutationFn: async () => {
            await fetch('/api/logout');
        },
        onSuccess: () => {
            auth.setLoggedIn(0);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['tools'] });
            queryClient.invalidateQueries({ queryKey: ['portalUsers'] });
        },
    });

    return { login, logout };
}
