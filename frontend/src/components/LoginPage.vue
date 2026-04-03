<script setup lang="ts">
  import { ref, onMounted } from "vue"
  import { useRouter } from "vue-router";
  import { useAuth } from "@/composables/useAuth"

  const { login } = useAuth();
  const router = useRouter();

  const name = ref('');
  const password = ref('');
  const showError = ref(false);

  function handleSubmit() {
    login.mutateAsync({ user: name.value, password: password.value }).then(id => {
      if (id > 0) {
        router.push('/');
      } else {
        showError.value = true;
      }
    });
  }

  onMounted(() => {
    login.mutateAsync({ user: '', password: '' }).then(id => {
      if (id > 0) {
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
