<script setup lang="ts">
  import { useStateStore } from "@/stores/state"
  import { ref, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";

  const myState = useStateStore();

  const toolId = useRoute().params.id as string;
  const router = useRouter();

  if (!toolId || Number.isNaN(+toolId)) {
    throw new Error("Tool ID is required");
  }

  const tool = ref(myState.findTool(+toolId));
  const toolName = ref(tool.value ? tool.value.name : "");
  const toolNameModified = ref(false);

  interface ToolTopUser {
    userId: number;
    userTotal: number;
    spindleTime: number;
  }
  const toolTopUsers = ref<ToolTopUser[]>([]);
  if (tool.value) {
      myState.getToolTopUsers(tool.value.id).then((topUsers) => {
        toolTopUsers.value = topUsers;
      });
  }

  watch(() => myState.tools, () => {
    tool.value = myState.findTool(+toolId);
    if (tool.value) {
      myState.getToolTopUsers(tool.value.id).then((topUsers) => {
        toolTopUsers.value = topUsers;
      });
    } else {
      toolTopUsers.value = [];
    }
    if (!toolNameModified.value && tool.value) {
      toolName.value = tool.value.name;
    }
  });

  function getTool() {
    return tool.value;
  }

  function getLastUserText() {
    const tool = getTool();
    if (!tool) {
      return "";
    }

    if (tool.log.length > 0) {
      const userName = myState.getLogEntryDisplayName(tool.log[0]);
      const dt = new Date(tool.log[0].timestamp * 1000);
      return userName + " (" + dt.toLocaleString() + ")";
    } else {
      return "";
    }
  }

  function getLastLogOp() {
    const tool = getTool();
    if (!tool) {
      return "";
    }

    if (tool.log.length > 0) {
      return tool.log[0].op;
    }
  }

  function toggleLockout() {
    const tool = getTool();
    if (!tool) {
      return "";
    }

    myState.setToolLockout(tool.id, !tool.isLocked).then (() => {
      myState.refreshData();
    });
  }

  function getSpindleTimeText() {
    const tool = getTool();
    if (!tool) {
      return "";
    }

    return myState.formatSeconds(tool.spindleTime);
  }

  function renameTool() {
    const tool = getTool();
    if (!tool) {
      return;
    }

    if (toolName.value.trim() === "") {
      alert("Tool name cannot be empty");
      return;
    }

    myState.editToolName(tool.id, toolName.value).then(() => {
      console.log("Tool name updated to: " + toolName.value);
      myState.refreshData();
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
        {{ getTool()!.currentUserId ? "In use by " + myState.getUserFullName(getTool()!.currentUserId) : "Idle" }}
      </span>
      <button class="btn btn-secondary" @click="toggleLockout">{{getTool()!.isLocked ? "End Lockout" : "Lockout"}}</button>
    </div>
    <div class="input-group m-2 p-0">
      <span class="bg-light border rounded-start p-1 w-25">Users</span>
      <span class="bg-white border p-1 flex-fill">
        {{ getTool()!.users.length }}
      </span>
      <button class="btn btn-secondary" @click="router.push('/tools/' + getTool()!.id + '/users')">Edit</button>
    </div>
    <div class="input-group m-2 p-0 d-flex">
      <span class="bg-light border rounded-start p-1 w-25">Last log entry</span>
      <span class="bg-white border p-1 text-truncate overflow-hidden" style="min-width: 0;flex:1">
        <i class="bi bi-arrow-right-circle-fill text-success" v-if="getLastLogOp() === 'in'"/>
        <i class="bi bi-arrow-left-circle-fill text-warning" v-if="getLastLogOp() === 'out'" />
        <i class="bi bi-exclamation-circle-fill text-danger" v-if="getLastLogOp() === 'err'" />
        {{ getLastUserText() }}
      </span>
      <RouterLink :to='"/tools/" + getTool()!.id + "/log"' class="btn btn-secondary d-flex align-items-center">Full Log</RouterLink>
    </div>
    <div class="input-group m-2 p-0 d-flex">
      <span class="bg-light border rounded-start p-1 w-25 d-flex align-items-center">Utilization</span>
      <span class="bg-white border p-1 flex-fill d-flex align-items-center">
        {{ getTool()!.utilization }}%
      </span>
      <span class="bg-light border rounded-left p-1 w-25 d-flex align-items-center">Spindle time</span>
      <span class="bg-white border p-1 flex-fill rounded-end d-flex align-items-center">
        {{ getSpindleTimeText() }}
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
            <td>{{ myState.findUser(user.userId)?.fullName ?? user.userId }}</td>
            <td>{{ myState.formatSeconds(user.userTotal) }}</td>
            <td>{{ myState.formatSeconds(user.spindleTime) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>
