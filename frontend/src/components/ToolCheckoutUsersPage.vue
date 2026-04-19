<script setup lang="ts">
  import { onMounted, ref, computed } from "vue";
  import { useTemplateRef } from "vue";
  import { useTools } from "@/composables/useTools";
  import { useUsers } from "@/composables/useUsers";
  import { useToolMutations, useToolCheckoutUsers } from "@/composables/useToolMutations";
  import { useRoute, useRouter } from "vue-router";
  import UserList from "@/components/UserList.vue"
  import { Modal } from "bootstrap"

  const router = useRouter();

  const toolId = useRoute().params.id as string;

  if (!toolId) {
    throw new Error("Tool ID is required");
  }

  const { findTool } = useTools();
  const { users, findUser } = useUsers();
  const { setCheckoutUsers } = useToolMutations();
  const { data: checkoutUserIds } = useToolCheckoutUsers(+toolId);

  const tool = computed(() => findTool(+toolId));
  const currentIds = computed(() => checkoutUserIds.value ?? []);

  const grouplist = useTemplateRef('group-members')

  const isModified = computed(() => grouplist.value?.modified);

  const confirmDlg = ref<Modal | null>(null);
  const confirmMsg = ref('')

  function confirmApply() {
    if (!grouplist.value?.modified) {
      onSaveChanges();
      return;
    }

    if (!tool.value) return;

    const addedUsers = grouplist.value?.newSelectedUsers.filter(x => !currentIds.value.includes(Number(x)));
    const removedUsers = currentIds.value.filter(x => !grouplist.value?.newSelectedUsers.includes(Number(x)));

    let message = "You have ";
    if (addedUsers.length > 0) {
      message += "added:<br>";
      addedUsers.forEach(x => message += "&nbsp;&nbsp;&nbsp;&nbsp;" + findUser(x)?.fullName + "<br />")
    }

    if (removedUsers.length > 0) {
      if (addedUsers.length > 0) message += "and "
      message += "removed:<br>";
      removedUsers.forEach(x => message += "&nbsp;&nbsp;&nbsp;&nbsp;" + findUser(x)?.fullName + "<br />")
    }

    message += "<br>Is this correct?"
    confirmMsg.value = message;
    confirmDlg.value?.show()
  }

  function onSaveChanges() {
    confirmDlg.value?.hide();

    if (!tool.value || !grouplist.value?.newSelectedUsers) return;

    setCheckoutUsers.mutateAsync({ toolId: tool.value.id, userIds: grouplist.value.newSelectedUsers }).then(() => {
      router.back();
    });
  }

  onMounted(() => {
    confirmDlg.value = new Modal('#confirm-checkout-dlg', { keyboard: false })
  })
</script>

<template>
  <form v-if="tool" class="border rounded d-flex flex-column flex-grow-1 ml-2 mt-2 p-2 h-100" @submit.prevent="confirmApply">

    <label class="form-label mt-2">{{tool.name}} checkout masters:</label>
    <UserList ref="group-members" :users="users" id-field="id" name-field="fullName"
      :selectedUsers="currentIds" :use-links="false">
    </UserList>

    <div class="d-flex">
      <button class="btn btn-outline-primary me-2" type="submit" :disabled="!isModified">Apply</button>
      <button class="btn btn-outline-danger me-2" type="reset" @click.prevent="router.back()">Cancel</button>
    </div>
  </form>

  <div class="modal" id="confirm-checkout-dlg">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Checkout masters</h5>
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
