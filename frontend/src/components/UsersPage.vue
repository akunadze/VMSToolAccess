<script setup lang="ts">
  import { useStateStore } from "@/stores/state"
  import type { UserData } from "@/stores/state"
  import UserList from "@/components/UserList.vue"

  const myState = useStateStore();

  function searchFn(user: UserData, search: string): boolean {
    if (!search || search.length === 0) {
      return true; // No search term, include all users
    }

    const searchLower = search.toLowerCase();

    return (user.fullName ? user.fullName.toLowerCase().includes(searchLower) : false) ||
           (user.email ? user.email.toLowerCase().includes(searchLower) : false) ||
           (user.card ? user.card.toLowerCase().includes(searchLower) : false) ||
           (user.doorCard ? user.doorCard.toLowerCase().includes(searchLower) : false);
  }
</script>

<template>
  <div>
    <UserList :users="myState.users" id-field="id" name-field="fullName" group-field="group"
      include-groups :link-fn="(x) => '/users/' + x.id" :search-fn="searchFn">
      <button class="btn btn-outline-secondary" @click="$router.push({ name: 'user profile', params: { id: 'newuser' } })">
        <i class="bi bi-plus"></i><i class="bi bi-person" />
      </button>
      <button class="btn btn-outline-secondary" @click="$router.push({ name: 'user profile', params: { id: 'newgroup' } })">
        <i class="bi bi-plus"></i><i class="bi bi-people" />
      </button>
    </UserList>
  </div>
</template>
