<script setup lang="ts">
  import { RouterView, useRouter } from 'vue-router'
  import { useAuthStore } from "@/stores/auth"
  import { useAuth } from "@/composables/useAuth"
  import { usePortalUsers } from "@/composables/usePortalUsers"
  import Breadcrumb from "@/components/BreadCrumb.vue"

  const auth = useAuthStore();
  const { logout } = useAuth();
  const { getPortalUsername } = usePortalUsers();
  const router = useRouter();

  function onChangePassword() {
  }

  function onLogout() {
    logout.mutateAsync().then(() => {
      router.push('/login');
    });
  }
</script>

<template>
  <div id="app" class="container-fluid d-flex flex-column h-100">
    <div style="d-flex">
      <div class="border bg-light mt-1 mb-1 p-3 d-flex flex-row align-items-center justify-content-center">
        <img src="./assets/VMS_Logo.png" /><h1><b>Tool Access Portal</b></h1>
      </div>
    </div>

    <div class="d-flex flex-row" :v-if="auth.isLoggedIn()">
      <Breadcrumb class="flex-grow-1" />
      <div class="dropdown">
        <i class="bi bi-person-circle" style="font-size: 1.5rem;" data-bs-toggle="dropdown"></i>
        <ul class="dropdown-menu pt-0">
          <li class="text-center bg-secondary text-white rounded-top">Welcome {{ getPortalUsername(auth.loggedInUserId) }}</li>
          <li><a class="dropdown-item" href="#" @click="onChangePassword">Change Password</a></li>
          <li><a class="dropdown-item" href="#" @click="onLogout">Logout</a></li>
        </ul>
      </div>
    </div>

    <div class="tab-content d-flex flex-column flex-grow-1 no-minh" style="height: 70vh;">
      <router-view />
    </div>
  </div>
</template>
<style>
html,body {
  height:99%;
}
.tab-content .active {
    display: flex
}
.no-minh {
  min-height: 0;
}
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
