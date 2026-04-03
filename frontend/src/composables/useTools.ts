import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { ToolData } from '@/types'

async function fetchTools(): Promise<ToolData[]> {
    const resp = await fetch('/api/tools');
    if (!resp.ok) throw new Error('Failed to fetch tools');
    const json = await resp.json();
    return json.data;
}

export function useTools() {
    const { data } = useQuery({
        queryKey: ['tools'],
        queryFn: fetchTools,
        staleTime: Infinity,
    });

    const tools = computed(() => data.value ?? []);

    function findTool(id: number): ToolData | undefined {
        return tools.value.find(t => t.id === id);
    }

    return { tools, findTool };
}
