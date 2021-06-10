<template>
    <b-modal size="lg" id="editToolUsersDlg" title="Edit Tool Users" @ok="handleOk" @hidden="onHide" @shown="onShow">
        <b-alert :v-model="errorMsg !== ''" variant="danger" dismissible>{{errorMsg}}</b-alert>
        <div class="d-flex justify-content-center">
        <v-multiselect-listbox ref="listbox"
            :options="this.$root.$data.shared.users"
            :reduce-display-property="(option) => option.fullName"
            :reduce-value-property="(option) => option.id"
            search-options-placeholder="All Users"
            selected-options-placeholder="Authorized Users"
            selected-no-options-text="No users selected"
            >
            
        </v-multiselect-listbox>
        </div>
    </b-modal>
</template>

<script>
export default {
  name: 'EditToolUsers',
  data() {return {
      tool: {},
      selectedUsers: [],
      errorMsg:""
  }},
  methods:{
    handleOk(bvModalEvt) {
      // Prevent modal from closing
      bvModalEvt.preventDefault()

      this.$root.editToolUsers(this.tool, this.$refs.listbox.selectedItems.map(x => x.id)).then(x => {
        if (x) {
          // Hide the modal manually
          this.$nextTick(() => {
            this.$bvModal.hide('editToolUsersDlg')
          })
        } else {
            this.nameError = x;
        }
      })
    },
    onHide() {
        this.$root.$data.shared.exitModal();
    },
    startDlg(x) {
        if (!this.$root.$data.shared.enterModal()) {
            return;
        }

        this.tool = x
        this.errorMsg = ""
        this.$bvModal.show('editToolUsersDlg')      
        //this.$refs.listbox.value = x.users
    },
    findUser(id) {
        console.log(id);
        console.log(this.$root.$data.shared.users);
        return this.$root.$data.shared.findUser(id);
    },
    onChange(x) {
      console.log(x[0]);
    },
    onShow() {
      for (let user of this.$refs.listbox.options) {
        if (this.tool.users.find(x => x === user.id)) {
          this.$refs.listbox.selectedItems.push(user);
        }
      }
    }

  },
  mounted() {
      this.$root.$on('edit-tool-users', x => this.startDlg(x))
  }
}
</script>

