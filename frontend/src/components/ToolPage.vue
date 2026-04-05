<script setup lang="ts">
  import { ref, computed, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useTools } from "@/composables/useTools";
  import { useUsers } from "@/composables/useUsers";
  import { useToolMutations, useToolTopUsers } from "@/composables/useToolMutations";
  import { formatSeconds } from "@/types";

  const toolId = useRoute().params.id as string;
  const router = useRouter();

  if (!toolId || Number.isNaN(+toolId)) {
    throw new Error("Tool ID is required");
  }

  const { findTool } = useTools();
  const { getUserFullName, getLogEntryDisplayName, findUser } = useUsers();
  const { setToolLockout, editToolName } = useToolMutations();
  const { data: topUsersData } = useToolTopUsers(+toolId);

  const tool = computed(() => findTool(+toolId));
  const toolName = ref('');
  const toolNameModified = ref(false);

  watch(tool, (t) => {
    if (!toolNameModified.value && t) {
      toolName.value = t.name;
    }
  }, { immediate: true });

  const toolTopUsers = computed(() => topUsersData.value ?? []);

  function getLastUserText() {
    if (!tool.value?.lastEntry) return "";
    const userName = getLogEntryDisplayName(tool.value.lastEntry);
    const dt = new Date(tool.value.lastEntry.timestamp * 1000);
    return userName + " (" + dt.toLocaleString() + ")";
  }

  function getLastLogOp() {
    return tool.value?.lastEntry?.op ?? "";
  }

  function toggleLockout() {
    if (!tool.value) return;
    setToolLockout.mutate({ toolId: tool.value.id, lockout: !tool.value.isLocked });
  }

  function renameTool() {
    if (!tool.value) return;
    if (toolName.value.trim() === "") {
      alert("Tool name cannot be empty");
      return;
    }
    editToolName.mutateAsync({ toolId: tool.value.id, name: toolName.value }).then(() => {
      toolNameModified.value = false;
    });
  }

  function resetToolName() {
    toolName.value = tool.value ? tool.value.name : "";
    toolNameModified.value = false;
  }

  function onToolNameChange() {
    toolNameModified.value = true;
  }
</script>

<template>
  <div class="d-flex flex-column h-100 p-3" v-if="tool">
    <div class="input-group m-2 p-0">
      <span class="bg-light border rounded-start p-1 w-25">Tool name</span>
      <input class="form-control border rounded-end p-1" type="text"
              v-model="toolName" @keyup.enter="renameTool()" @keyup.esc="resetToolName()" @input="onToolNameChange()" />
      <button class="btn btn-outline-primary" v-if="toolNameModified" @click="renameTool()"><i class="bi bi-check"></i></button>
      <button class="btn btn-outline-danger" v-if="toolNameModified" @click="resetToolName()"><i class="bi bi-x"></i></button>
    </div>

    <div class="input-group m-2 p-0">
      <span class="bg-light border rounded-start p-1 w-25">Status</span>
      <span class="bg-white border p-1 flex-fill">
        {{ tool.currentUserId ? "In use by " + getUserFullName(tool.currentUserId) : "Idle" }}
      </span>
      <button class="btn btn-secondary" @click="toggleLockout">{{tool.isLocked ? "End Lockout" : "Lockout"}}</button>
    </div>
    <div class="input-group m-2 p-0">
      <span class="bg-light border rounded-start p-1 w-25">Users</span>
      <span class="bg-white border p-1 flex-fill">
        {{ tool.users.length }}
      </span>
      <button class="btn btn-secondary" @click="router.push('/tools/' + tool.id + '/users')">Edit</button>
    </div>
    <div class="input-group m-2 p-0 d-flex">
      <span class="bg-light border rounded-start p-1 w-25">Last log entry</span>
      <span class="bg-white border p-1 text-truncate overflow-hidden" style="min-width: 0;flex:1">
        <i class="bi bi-arrow-right-circle-fill text-success" v-if="getLastLogOp() === 'in'"/>
        <i class="bi bi-arrow-left-circle-fill text-warning" v-if="getLastLogOp() === 'out'" />
        <i class="bi bi-exclamation-circle-fill text-danger" v-if="getLastLogOp() === 'err'" />
        {{ getLastUserText() }}
      </span>
      <RouterLink :to='"/tools/" + tool.id + "/log"' class="btn btn-secondary d-flex align-items-center">Full Log</RouterLink>
    </div>
    <div class="input-group m-2 p-0 d-flex">
      <span class="bg-light border rounded-start p-1 w-25 d-flex align-items-center">Utilization</span>
      <span class="bg-white border p-1 flex-fill d-flex align-items-center">
        {{ tool.utilization }}%
      </span>
      <span class="bg-light border rounded-left p-1 w-25 d-flex align-items-center">Spindle time</span>
      <span class="bg-white border p-1 flex-fill rounded-end d-flex align-items-center">
        {{ formatSeconds(tool.spindleTime) }}
      </span>
    </div>
    <div class="m-2 d-flex w-100">
      <table class="table table-striped table-bordered">
        <thead>
          <tr>
            <th>Top Users</th>
            <th>Total Time</th>
            <th>Spindle Time</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in toolTopUsers" :key="user.userId">
            <td>{{ findUser(user.userId)?.fullName ?? user.userId }}</td>
            <td>{{ formatSeconds(user.userTotal) }}</td>
            <td>{{ formatSeconds(user.spindleTime) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>
