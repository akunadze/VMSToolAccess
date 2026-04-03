<script setup lang="ts">
  import { usePortalUsers } from "@/composables/usePortalUsers"
  import UserList from "@/components/UserList.vue"

  const { portalUsers } = usePortalUsers();
</script>

<template>
  <div>
    <UserList :users="portalUsers" id-field="id" name-field="name"
      :link-fn="(x) => '/portalusers/' + x.id">
      <button class="btn btn-outline-secondary" @click="$router.push({ name: 'portal user', params: { id: 'newuser' } })">
        <i class="bi bi-plus"></i><i class="bi bi-person" />
      </button>
    </UserList>
  </div>
</template>
