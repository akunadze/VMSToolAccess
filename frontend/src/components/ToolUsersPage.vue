<script setup lang="ts">
  import { onMounted, ref, computed } from "vue";
  import { useTemplateRef } from "vue";
  import { useStateStore } from "@/stores/state"
  import { useRoute, useRouter } from "vue-router";
  import UserList from "@/components/UserList.vue"
  import { Modal } from "bootstrap"

  const myState = useStateStore();
  const router = useRouter();

  const toolId = useRoute().params.id as string;

  if (!toolId) {
    throw new Error("Tool ID is required");
  }

  function getTool() {
    return myState.tools.find(t => t.id === +toolId);
  }

  const grouplist = useTemplateRef('group-members')

  const isModified = computed(() => grouplist.value?.modified);

  const confirmDlg = ref<Modal | null>(null);

  const confirmMsg = ref('')

  function confirmApply() {
    if (!grouplist.value?.modified) {
      onSaveChanges();
      return;
    }

    const tool = getTool();
    if (!tool) {
      return;
    }

    const addedUsers = grouplist.value?.newSelectedUsers.filter(x => !tool.users.includes(Number(x)));
    const removedUsers = tool.users.filter(x => !grouplist.value?.newSelectedUsers.includes(Number(x)));

    let message = "You have ";
    if (addedUsers.length > 0) {
      message += "added:<br>";
      addedUsers.forEach(x => message += "&nbsp;&nbsp;&nbsp;&nbsp;" + myState.users.find(u => u.id === x)?.fullName + "<br />")
    }

    if (removedUsers.length > 0) {
      if (addedUsers.length > 0) {
        message += "and "
      }

      message += "removed:<br>";
      removedUsers.forEach(x => message += "&nbsp;&nbsp;&nbsp;&nbsp;" + myState.users.find(u => u.id === x)?.fullName + "<br />")
    }

    message += "<br>Is this correct?"

    confirmMsg.value = message;

    confirmDlg.value?.show()
  }

  function onSaveChanges() {
    confirmDlg.value?.hide();

    const tool = getTool();
    if (!tool || !grouplist.value?.newSelectedUsers) {
      return;
    }

    myState.editToolUsers(tool.id, grouplist.value?.newSelectedUsers).then(res => {
      if (res) {
        myState.refreshData();
        router.back();
      }
    });
  }

  onMounted(() => {
    confirmDlg.value = new Modal('#confirm-dlg', {keyboard: false})
  })

</script>

<template>
  <form v-if="getTool()" class="border rounded d-flex flex-column flex-grow-1 ml-2 mt-2 p-2 h-100" @submit.prevent="confirmApply">

    <label class="form-label mt-2">{{getTool()!.name}} users:</label>
    <UserList ref="group-members" :users="myState.users" id-field="id" name-field="fullName"
      :selectedUsers="getTool()!.users" :use-links="false">
    </UserList>

    <div class="d-flex">
      <button class="btn btn-outline-primary me-2" type="submit" :disabled="!isModified">Apply</button>
      <button class="btn btn-outline-danger me-2" type="reset" @click.prevent="router.back()" >Cancel</button>
    </div>
  </form>

  <div class="modal" id="confirm-dlg">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Tool access list</h5>
          <button type="button" class="btn-close"></button>
        </div>
        <div class="modal-body">
          <span v-html="confirmMsg"></span>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" @click="onSaveChanges">Yes</button>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">No</button>
        </div>
      </div>
    </div>
  </div>
</template>
