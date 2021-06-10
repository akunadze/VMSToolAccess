<template>
    <form class="p-2" ref="form" @submit.stop.prevent="handleSubmit">
    <b-alert v-model="showError" variant="danger" dismissible>Authentication failure</b-alert>
    <b-form-group label="Username" label-for="name-input">
        <b-form-input id="name-input" v-model="name" required autocomplete="off" autofocus />
    </b-form-group>
    <b-form-group label="Password" label-for="password-input">
        <b-form-input type="password" id="password-input" v-model="password" required autocomplete="off" />
    </b-form-group>
    <b-button type="submit">Login</b-button>
    </form>
</template>

<script>
export default {
  name: 'Login',
  data() {return {
    name: '',
    password: '',
    showError: false
  }},
  methods:{
    handleSubmit() {
        this.$root.login(this.name, this.password).then(x => {
            this.$root.setLoggedIn(x);
            if (x) {
                this.$root.refreshData();
                this.$router.push('/tools');
            } else {
              this.showError = true;
            }
        });
    }
  },
  mounted() {
    this.$root.login('', '').then(x => {
        this.$root.setLoggedIn(x);
        if (x) {
            this.$root.refreshData();
            this.$router.push('/tools');
        }
    })
  }
}
</script>
