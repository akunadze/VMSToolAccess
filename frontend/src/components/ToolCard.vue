<script setup lang="ts">
import { useUsers } from "@/composables/useUsers"
import type { ToolData } from "@/types"

const props = defineProps<{
  tool: ToolData
}>()

const { getUserFullName, getLogEntryDisplayName } = useUsers();

function getLastUseData() {
  if (props.tool.lastEntry) {
    return {
      user: getLogEntryDisplayName(props.tool.lastEntry),
      timestamp: new Date(props.tool.lastEntry.timestamp * 1000).toLocaleString(),
      op: props.tool.lastEntry.op
    };
  } else {
    return null;
  }
}

function getStatusText() {
  const lastUseData = getLastUseData();

  if (lastUseData) {
    if (props.tool.currentUserId) {
      return "In use by " + getUserFullName(props.tool.currentUserId) + "<br>(" + lastUseData.timestamp + ")";
    }

    return "Last used by " + lastUseData.user + "<br>(" + lastUseData.timestamp + ")";
  }

  return "Waiting for<br>first use";
}

function getHeaderClass() {
  if (props.tool.offline || props.tool.isLocked) {
    return "bg-danger-subtle";
  } else if (props.tool.currentUserId) {
    return "bg-primary-subtle";
  } else {
    return "bg-secondary-subtle";
  }
}

</script>

<template>
  <div class="card m-1 mb-3">
    <div class="card-header text-center p-1"
      :class="getHeaderClass()">
      <RouterLink :to="'/tools/' + tool.id"
        class="btn w-100 p-1 m-0 text-primary-emphasis"
      >{{ tool.name }}</RouterLink>

    </div>
    <div class="card-body">
      <p class="text-center m-0" v-html="getStatusText()"></p>
    </div>
    <div class="card-footer d-flex flex-row bg-secondary-subtle" style="height: 2.5rem;">
      <i class="bi bi-lock pe-2 text-secondary-emphasis" v-if="tool.isLocked"/>
      <i class="bi bi-wifi-off pe-2 text-secondary-emphasis" v-if="tool.offline"/>
      <span class="ms-auto text-end">{{ "v" + (tool.version ?? "?") }}</span>
      </div>
  </div>

</template>
