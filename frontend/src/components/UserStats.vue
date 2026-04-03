<script setup lang="ts">
  import { useRoute } from "vue-router";
  import { useTools } from "@/composables/useTools";
  import { useUserTopTools } from "@/composables/useToolMutations";
  import { formatSeconds } from "@/types";

  const userId = useRoute().params.id as string;

  if (!userId) {
    throw new Error("User ID is required");
  }

  const { findTool } = useTools();
  const { data: topToolsData } = useUserTopTools(+userId);

  const topTools = topToolsData;
</script>

<template>
    <div class="m-2 d-flex w-100">
      <table class="table table-striped table-bordered">
        <thead>
          <tr>
            <th>Top Tools</th>
            <th>Total Time</th>
            <th>Spindle Time</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tool in topTools" :key="tool.toolId">
            <td>{{ findTool(tool.toolId)?.name ?? tool.toolId }}</td>
            <td>{{ formatSeconds(tool.totalTime) }}</td>
            <td>{{ formatSeconds(tool.totalSpindleTime) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
</template>
