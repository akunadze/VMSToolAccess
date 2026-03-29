<script setup lang="ts">
  import { useStateStore } from "@/stores/state"
  import UserList from "@/components/UserList.vue"

  const myState = useStateStore();
</script>

<template>
  <div>
    <UserList :users="myState.portalUsers" id-field="id" name-field="name"
      :link-fn="(x) => '/portalusers/' + x.id">
      <button class="btn btn-outline-secondary" @click="$router.push({ name: 'portal user', params: { id: 'newuser' } })">
        <i class="bi bi-plus"></i><i class="bi bi-person" />
      </button>
    </UserList>
  </div>
</template>
