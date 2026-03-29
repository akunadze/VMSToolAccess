<script setup lang="ts">
  import { reactive } from "vue";
  import { useStateStore } from "@/stores/state"
  import { useRoute, useRouter } from "vue-router";

  const myState = useStateStore();
  const router = useRouter();

  const userId = useRoute().params.id as string;

  if (!userId) {
    throw new Error("Portal User ID is required");
  }

  let newUser = false;

  const data = reactive({
    id: 0,
    name: '',
    newPassword: '',
    isModified: false
  });

  if (userId === 'newuser') {
    newUser = true;
  } else {
    newUser = false;
    const foundUser = myState.findPortalUser(+userId);
    if (!foundUser) {
      throw new Error("Portal user not found");
    }
    data.id = foundUser.id;
    data.name = foundUser.name;
  }


  function onDelete() {
    if (data.id > 0) {
      myState.deletePortalUser(data.id).then(res => {
        if (res) {
          myState.refreshData();
          router.back();
        }
      });
    }
  }

  function onInput() {
    data.isModified = true;
  }

  function onSubmit() {
    if (newUser) {
      myState.addPortalUser(data.name, data.newPassword).then(res => {
        if (res) {
          myState.refreshData();
          router.back();
        }
      });
    } else {
      myState.editPortalUser(data.id, data.name, data.newPassword).then(res => {
        if (res) {
          myState.refreshData();
          router.back();
        }
      });
    }
  }
</script>

<template>
  <form class="border rounded d-flex flex-column flex-grow-1 ml-2 mt-2 p-2 h-100" @submit.prevent="onSubmit">
    <label for="name-field" class="form-label">Full Name:</label>
    <div class="input-group" id="name-group">
      <input class="form-control"
              id="name-field"
              v-model="data.name"
              placeholder="Enter name"
              aria-required="true"
              @input="onInput()" />
    </div>

    <label for="password-field" class="form-label mt-2">Password:</label>
    <div class="input-group" id="password-group">
      <input class="form-control"
                id="password-field"
                v-model="data.newPassword"
                type="password"
                placeholder="Enter new password"
                @input="onInput()" />
    </div>

    <div class="d-flex mt-2">
      <button class="btn btn-outline-primary me-2" type="submit" :disabled="!data.isModified">Apply</button>
      <button class="btn btn-outline-danger me-2" type="reset" @click.prevent="router.back()" >Cancel</button>
      <button class="btn btn-outline-danger ms-auto" type="button" v-if="!newUser" @click.prevent="onDelete()">Delete</button>
    </div>
  </form>
</template>
