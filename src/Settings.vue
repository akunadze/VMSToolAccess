<template>
    <b-form class="p-2" ref="form" @submit.stop.prevent="handleSubmit">
      <b-alert v-model="showError" variant="danger" dismissible>{{errorMsg}}</b-alert>
      <b-alert v-model="showSuccess" variant="success" dismissible>Password changed successfully</b-alert>
      <b-form-group label="Current password" label-for="current-password">
          <b-form-input id="current-password" v-model="oldPass" required autocomplete="off" autofocus />
      </b-form-group>
      <b-form-group label="New password" label-for="new-password">
          <b-form-input id="new-password" v-model="newPass" required autocomplete="off" />
      </b-form-group>
      <b-form-group label="Re-type new password" label-for="new-password-repeat" >
          <b-form-input id="new-password-repeat" v-model="newPassRepeat" required autocomplete="off" :state="passState()"/>
      </b-form-group>
      <b-button type="submit">Apply</b-button>
    </b-form>
</template>

<script>
export default {
  name: 'Settings',
  data() {return {
    oldPass: '',
    newPass: '',
    newPassRepeat: '',
    showError: false,
    showSuccess: false,
    errorMsg: 'Error changing password'
  }},
  methods:{
    handleSubmit() {
        console.log('Submitting');
        this.$root.changeAdminPass(this.oldPass, this.newPass).then(x => {
          if (x) {
            this.showSuccess = true;
            this.showError = false;
          } else {
            this.showSuccess = false;
            this.showError = true;
          }
        });
    },
    passState() {
      return this.newPass ? this.newPass === this.newPassRepeat : null;
    }
  },
  mounted() {
  }
}
</script>
