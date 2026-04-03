<script setup lang="ts">
  import type { UserData } from "@/types"
  import { onMounted, ref, reactive, computed, watch } from "vue";
  import { useTemplateRef } from "vue";
  import { useUsers } from "@/composables/useUsers"
  import { useUserMutations } from "@/composables/useUserMutations"
  import { useRoute, useRouter } from "vue-router";
  import UserList from "@/components/UserList.vue"
  import { Modal } from "bootstrap"

  const router = useRouter();

  const userId = useRoute().params.id as string;

  if (!userId) {
    throw new Error("User ID is required");
  }

  const { users, findUser } = useUsers();
  const { addUser, editUser, deleteUser } = useUserMutations();

  let newUser = false;
  if (userId === 'newuser') {
    newUser = true;
  } else if (userId === 'newgroup') {
    newUser = true;
  }

  const selectedUser = reactive<UserData>({
    id: 0,
    fullName: '',
    email: '',
    card: '',
    doorCard: '',
    group: userId === 'newgroup',
    members: []
  });

  const data = reactive({
    name: '',
    email: '',
    card: '',
    doorCard: '',
    isModified: false
  });

  if (!newUser) {
    const foundUser = computed(() => findUser(+userId));
    watch(foundUser, (user) => {
      if (user) {
        Object.assign(selectedUser, user);
        if (!data.isModified) {
          data.name = user.fullName;
          data.email = user.email;
          data.card = user.card;
          data.doorCard = user.doorCard;
        }
      }
    }, { immediate: true });
  }

  const grouplist = useTemplateRef('group-members')

  const isModified = computed(() => data.isModified || grouplist.value?.modified);

  const confirmDlg = ref<Modal | null>(null);

  const confirmMsg = ref('')

  function confirmApply() {
    if (!grouplist.value?.modified || newUser) {
      onSaveChanges();
      return;
    }

    const addedUsers = grouplist.value?.newSelectedUsers.filter(x => !selectedUser?.members.includes(x));
    const removedUsers = selectedUser?.members.filter(x => !grouplist.value?.newSelectedUsers.includes(x));

    let message = "You have ";
    if (addedUsers.length > 0) {
      message += "added:<br>";
      addedUsers.forEach(x => message += "&nbsp;&nbsp;&nbsp;&nbsp;" + users.value.find(u => u.id === x)?.fullName + "<br />")
    }

    if (removedUsers.length > 0) {
      if (addedUsers.length > 0) {
        message += "and "
      }

      message += "removed:<br>";
      removedUsers.forEach(x => message += "&nbsp;&nbsp;&nbsp;&nbsp;" + users.value.find(u => u.id === x)?.fullName + "<br />")
    }

    confirmMsg.value = message

    confirmDlg.value?.show()
  }

  function onDelete() {
    if (selectedUser.id > 0) {
      deleteUser.mutateAsync(selectedUser.id).then(() => {
        router.back();
      });
    }
  }

  function onInput() {
    data.isModified = true;
  }

  function onSaveChanges() {
    confirmDlg.value?.hide();

    if (!selectedUser) return;

    selectedUser.fullName = data.name;
    selectedUser.email = data.email;
    selectedUser.card = data.card;
    selectedUser.doorCard = data.doorCard;

    if (selectedUser.group) {
      selectedUser.members = grouplist.value?.newSelectedUsers || [];
    }

    if (newUser) {
      addUser.mutateAsync(selectedUser).then(() => {
        router.back();
      });
    } else {
      editUser.mutateAsync(selectedUser).then(() => {
        router.back();
      });
    }
  }

  onMounted(() => {
    confirmDlg.value = new Modal('#confirm-dlg', {keyboard: false})
  })

</script>

<template>
  <form class="border rounded d-flex flex-column flex-grow-1 ml-2 mt-2 p-2 h-100" @submit.prevent="confirmApply">
    <label for="name-field" class="form-label">Full Name:</label>
    <div class="input-group" id="name-group">
      <input class="form-control"
              id="name-field"
              v-model="data.name"
              placeholder="Enter name"
              aria-required="true"
              @input="onInput()" />
    </div>

    <div v-if="!selectedUser?.group">
      <label for="email-field" class="form-label mt-2">Email:</label>
      <div class="input-group" id="email-group">
        <input class="form-control"
                  id="email-field"
                  v-model="data.email"
                  type="email"
                  placeholder="Enter email address"
                  @input="onInput()" />
      </div>

      <label for="card-field" class="form-label mt-2">Tool Card ID:</label>
      <div class="input-group" id="card-group" label="Tool Card ID:" label-for="card-field">
        <input class="form-control"
            id="card-field"
            v-model="data.card"
            placeholder="Enter or scan tool card ID"
            @input="onInput()" />
      </div>

      <label for="door-card-field" class="form-label mt-2">Door Card ID:</label>
      <div class="input-group mb-2" id="door-card-group">
        <input class="form-control"
              id="door-card-field"
              v-model="data.doorCard"
              placeholder="Enter door card ID"
              @input="onInput()" />
      </div>
    </div>

    <template v-if="selectedUser.group">
      <label class="form-label mt-2">Members:</label>
      <UserList ref="group-members" :users="users" :selectedUsers="selectedUser.members"
        id-field="id" name-field="fullName" group-field="group"
        :use-links="false" :include-groups="false">
      </UserList>
    </template>

    <div class="d-flex">
      <button class="btn btn-outline-primary me-2" type="submit" :disabled="!isModified">Apply</button>
      <button class="btn btn-outline-danger me-2" type="reset" @click.prevent="router.back()" >Cancel</button>
      <button class="btn btn-outline-danger ms-auto me-auto" type="button" v-if="!newUser"
        @click.prevent="$router.push({ name: 'user stats', params: { id: selectedUser.id } })">
        Stats
      </button>
      <button class="btn btn-outline-danger ms-auto" type="button" v-if="!newUser" @click.prevent="onDelete()">Delete</button>
    </div>
  </form>

  <div class="modal" id="confirm-dlg">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Modal title</h5>
          <button type="button" class="btn-close"></button>
        </div>
        <div class="modal-body">
          <span v-html="confirmMsg"></span>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          <button type="button" class="btn btn-primary" @click="onSaveChanges">Save changes</button>
        </div>
      </div>
    </div>
  </div>
</template>
