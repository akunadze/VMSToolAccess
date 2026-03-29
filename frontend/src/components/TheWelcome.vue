<script setup lang="ts">
</script>

<template>
  <div class="d-flex flex-row flex-wrap p-2 justify-content-center">
    <RouterLink class="d-flex flex-column m-2" to="/tools">
        <img src="@/assets/ToolsIcon.svg" width="300" height="300" />
        <h1 class="text-center">Tools</h1>
    </RouterLink>
    <RouterLink class="d-flex flex-column m-2" to="/users">
      <img src="@/assets/UsersIcon.svg" width="300" height="300" />
      <h1 class="text-center">Users</h1>
    </RouterLink>
    <RouterLink class="d-flex flex-column m-2" to="/portalusers">
      <img src="@/assets/PortalUsersIcon.svg" width="300" height="300" />
      <h1 class="text-center">Admins</h1>
    </RouterLink>
  </div>
</template>
