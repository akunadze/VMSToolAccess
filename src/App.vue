<template>
  <div id="app" class="container-fluid d-flex flex-column h-100">
    <div class="border bg-light mt-1 mb-1 p-3 d-flex flex-row align-items-center justify-content-center">
      <img src="./assets/VMS_Logo.png" /><h1><b>Tool Access Portal</b></h1>
    </div>

    <b-nav tabs v-if="isLoggedIn()">
      <b-nav-item to="/tools" :active="$route.name == 'tools'">Tools</b-nav-item>
      <b-nav-item to="/users" :active="$route.name == 'users'">Users</b-nav-item>
      <b-nav-item to="/stats" :active="$route.name == 'stats'">Stats</b-nav-item>
      <b-nav-item to="/settings">Settings</b-nav-item>
      <a href="#" @click="onLogout" class="m-2 ml-auto align-baseline">Logout</a>
    </b-nav>

    <router-view />

  </div>
</template>

<script>
export default {
  name: 'app',
  data() {return {
  }},
  methods:{
    isLoggedIn() {
      return this.$root.isLoggedIn();
    },
    onLogout(ev) {
      ev.preventDefault();
      this.$root.logout().then(() => {
        this.$router.push('/Login');
      });
    }
  },
  mounted() {
    document.title = "VMS Tool Access Portal";
  }
}
</script>
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

