<script setup lang="ts">
  import { onMounted, ref, reactive, computed } from "vue";
  import { useStateStore } from "@/stores/state"
  import { useRoute, useRouter } from "vue-router";

  const myState = useStateStore();

  const userId = useRoute().params.id as string;

  if (!userId) {
    throw new Error("User ID is required");
  }

  const selectedUser = myState.findUser(+userId);
  if (!selectedUser) {
    throw new Error("User not found");
  }

  interface UserTopTools {
    toolId: number;
    totalTime: number;
    totalSpindleTime: number;
  }
  const topTools = ref<UserTopTools[]>([]);

  onMounted(() => {
    if (selectedUser) {
      myState.getUserTopTools(selectedUser.id).then((x) => {
        topTools.value = x;
      });
    }
  });
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
            <td>{{ myState.findTool(tool.toolId)?.name ?? tool.toolId }}</td>
            <td>{{ myState.formatSeconds(tool.totalTime) }}</td>
            <td>{{ myState.formatSeconds(tool.totalSpindleTime) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
</template>
