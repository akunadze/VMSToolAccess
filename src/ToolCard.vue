<template>
    <b-card class="m-1 p-0 w-100" no-body>
    <b-card-body class="p-0">
        <b-card-header class="text-center m-0 p-1" >
          <b-button block v-b-toggle="'toolBody'+tool.id" class="d-flex text-left" 
            :variant="tool.offline ? 'danger' : (tool.currentUserId ? 'primary' : 'secondary')" v-b-hover="onTitleHover"
          >
            {{tool.name + (tool.currentUserId ? " (" + this.$root.getUserFullName(tool.currentUserId) + ")" : "")}}
            <b-icon icon="pencil" class="ml-auto align-self-center" v-show="showIcons" @click.stop="editTool"/>
            <b-icon icon="x" class="ml-2 align-self-center" v-show="showIcons" @click.stop="deleteTool"/>
          </b-button>
        </b-card-header>
        <b-collapse :id="'toolBody'+tool.id">
          <div class="m-2 p-0 d-flex">
            <span class="bg-light border rounded-left p-1 w-25">Status</span>
            <span class="bg-white border rounded-right p-1 flex-fill">
              {{ tool.currentUserId ? "In use by " + this.$root.getUserFullName(tool.currentUserId) : "Idle" }}
            </span>
            <b-button @click="toggleLockout">{{tool.isLocked ? "End Lockout" : "Lockout"}}</b-button>
          </div>
          <div class="m-2 p-0 d-flex">
            <span class="bg-light border rounded-left p-1 w-25">Users</span>
            <span class="bg-white border p-1 flex-fill">
              {{ tool.users.length }}
            </span>
            <b-button @click="editUsers">Edit</b-button>
          </div>
          <div class="m-2 p-0 d-flex">
            <span class="bg-light border rounded-left p-1 w-25">Last log entry</span>
            <span class="bg-white border p-1 flex-fill">
              <b-icon icon="arrow-right-circle-fill" variant="success" v-if="this.getLastLogOp() === 'in'"/>
              <b-icon icon="arrow-left-circle-fill" variant="warning" v-if="this.getLastLogOp() === 'out'" />
              <b-icon icon="exclamation-circle-fill" variant="danger" v-if="this.getLastLogOp() === 'err'" />
              {{ this.getLastUserText() }}
            </span>
            <b-button @click="viewLog">Full Log</b-button>
          </div>
          <div class="m-2 p-0 d-flex">
            <span class="bg-light border rounded-left p-1 w-25">Utilization</span>
            <span class="bg-white border p-1 flex-fill">
              {{ tool.utilization }}%
            </span>
          </div>
        </b-collapse>
    </b-card-body>

    </b-card>
</template>

<script>
export default {
  name: 'ToolCard',
  props: ['tool'],
  components: {
  },
  data () {return {
    showIcons: false,
    deleteConfirm: false
  }},
  methods: {
    editUsers() {
      console.log("Calling editTool");
      console.log(this.tool);
      this.$root.$emit('edit-tool-users', this.tool);
    },
    editTool() {
      this.$root.$emit('edit-tool', this.tool);
    },
    viewLog() {
      this.$root.$emit('view-tool-log', this.tool);
    },
    deleteTool() {
      if (!this.$root.$data.shared.enterModal()) {
        return;
      }
        
      this.deleteConfirm = false;
      this.$bvModal.msgBoxConfirm('Are you sure you want to delete "' + this.tool.name + '"?', {
        title: 'Please Confirm',
        size: 'md',
        buttonSize: 'sm',
        okVariant: 'danger',
        okTitle: 'Yes',
        cancelTitle: 'No',
        footerClass: 'p-2',
        hideHeaderClose: false,
        centered: true
      }).then(value => {
        if (value) {
          this.$root.deleteTool(this.tool.id);
        }
        this.$root.$data.shared.exitModal();
      }).catch(err => {
        console.log(err);
        this.$root.$data.shared.exitModal();
      })
    },
    toggleLockout() {
      this.$root.setToolLockout(this.tool.id, !this.tool.isLocked);
    },
    onTitleHover(isHover) {
      this.showIcons = isHover;
    },
    getLastLogOp() {
      if (this.tool.log.length > 0) {
        return this.tool.log[0].op;
      }
    },
    getLastUserText() {
      if (this.tool.log.length > 0) {
        const userName = this.$root.getLogEntryDisplayName(this.tool.log[0]);
        const dt = new Date(this.tool.log[0].timestamp * 1000);
        return userName + " (" + dt.toLocaleString() + ")";
      } else {
        return "";
      }
    }
  }
}
</script>
