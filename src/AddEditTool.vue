<template>
    <b-modal id="addToolDlg" :title="this.editMode ? 'Edit Tool' : 'Add Tool'"
      @ok="handleOk" @hidden="onHide"
    >
      <form ref="form" @submit.stop.prevent="handleSubmit">
        <b-form-group
          label="Tool Name"
          label-for="name-input"
          :invalid-feedback="nameError"
          :state="nameState"
        >
          <b-form-input
            id="name-input"
            v-model="name"
            :state="nameState"
            required
            autocomplete="off"
            autofocus
          ></b-form-input>
        </b-form-group>
      </form>
    </b-modal>
</template>

<script>
import ToolCard from './ToolCard.vue'
import EditToolUsers from './EditToolUsers.vue'

export default {
  name: 'AddEditTool',
  data() {return {
    tool: null,
    editMode: 'false',
    name: '',
    nameState: null,
    nameError: ''
  }},
  components: {
    ToolCard,
    EditToolUsers
  },
  methods:{
    onHide() {
        this.$root.$data.shared.exitModal();
    },
    startDlg(tool) {
      if (!this.$root.$data.shared.enterModal()) {
        return;
      }

      this.nameState = null;
      this.nameError = ''
      
      if (tool) {
        this.tool = tool;
        this.editMode = true;
        this.name = tool.name;
      } else {
        this.tool = null;
        this.editMode = false;
        this.name = "";
      }
      this.$bvModal.show('addToolDlg')
    },
    checkFormValidity() {
      const valid = this.$refs.form.checkValidity()
      if (!valid) {
        this.nameError = 'Name is required'
      }
      this.nameState = valid

      return valid
    },
    handleOk(bvModalEvt) {
      // Prevent modal from closing
      bvModalEvt.preventDefault()
      // Trigger submit handler
      this.handleSubmit()
    },
    handleSubmit() {
      // Exit when the form isn't valid
      if (!this.checkFormValidity()) {
        return
      }

      let promise = null;
      if (this.editMode) {
        promise = this.$root.editTool(this.tool, this.name);
      } else {
        promise = this.$root.addNewTool(this.name);
      }
      promise.then(x => {
        if (x) {
          // Hide the modal manually
          this.$nextTick(() => {
            this.$bvModal.hide('addToolDlg')
          })
        } else {
          this.nameState = false;
          this.nameError = x;
        }
      })
    }
  },
  mounted() {
      this.$root.$on('edit-tool', x => this.startDlg(x))
  }
}
</script>
