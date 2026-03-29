<script setup lang="ts">
  import { useStateStore } from "@/stores/state"
  import { ref, onMounted } from "vue"
  import { useRouter } from "vue-router";

  const myState = useStateStore();
  const router = useRouter();

  const name = ref('');
  const password = ref('');
  const showError = ref(false);

  function handleSubmit() {
    myState.login(name.value, password.value).then(x => {
      myState.setLoggedIn(x);
      myState.setLoggedInUser(x);
      if (x > 0) {
        myState.refreshData();
        router.push('/');
      } else {
        showError.value = true;
      }
    });
  }

  onMounted(() => {
    myState.login('', '').then(x => {
        myState.setLoggedIn(x);
        myState.setLoggedInUser(x);
        if (x) {
            myState.refreshData();
            router.push('/');
        }
    });
  });
</script>

<template>
  <form class="p-2" ref="form" @submit.stop.prevent="handleSubmit">
    <div class="alert alert-danger" v-if="showError">Authentication failure</div>
    <div class="input-group">
      <div class="input-group-text"><i class="bi bi-person-fill"></i></div>
        <input class="form-control" id="name-input" v-model="name" required autocomplete="off" autofocus />
    </div>
    <div class="input-group mt-2">
      <div class="input-group-text"><i class="bi bi-lock-fill"></i></div>
        <input class="form-control" type="password" id="password-input" v-model="password" required autocomplete="off" />
    </div>
    <button class="btn btn-primary mt-2" type="submit">Login</button>
  </form>
</template>

