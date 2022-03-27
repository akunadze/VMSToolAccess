<template>
    <b-modal id="toolLogDlg" :title="title" @hidden="onHide" hide-footer>
        <div class="" style="overflow-y:auto; height:30rem">
        <b-list-group>
          <b-list-group-item v-for="entry in this.log" v-bind:key="entry.timestamp">
            <b-row>
              <b-col cols="1">
                <b-icon icon="arrow-right-circle-fill" variant="success" v-if="entry.op === 'in'"/>
                <b-icon icon="arrow-left-circle-fill" variant="warning" v-if="entry.op === 'out'" />
                <b-icon icon="exclamation-circle-fill" variant="danger" v-if="entry.op === 'err'" />
              </b-col>
              <b-col cols="4">
                {{getUserFullName(entry)}}
              </b-col>
              <b-col>
                {{formatTimestamp(entry.timestamp)}}
              </b-col>
            </b-row>
          </b-list-group-item>
        </b-list-group>
        </div>
    </b-modal>
</template>

<script>
export default {
  name: 'ToolLog',
  data() {return {
    tool: null,
    log: [],
    title: ""
  }},
  components: {
  },
  methods:{
    onHide() {
        this.$root.$data.shared.exitModal();
    },
    startDlg(tool) {
      if (!this.$root.$data.shared.enterModal()) {
        return;
      }

      this.tool = tool;
      this.log = tool.log;
      this.title = tool.name + " log";

      this.$bvModal.show('toolLogDlg')
    },
    getUserFullName(entry) {
      return this.$root.getLogEntryDisplayName(entry);
    },
    formatTimestamp(ts) {
      let dt = new Date(ts * 1000);
      return dt.toLocaleString();
    }
  },
  mounted() {
      this.$root.$on('view-tool-log', x => this.startDlg(x))
  },
  beforeDestroy() {
    this.$root.$off('view-tool-log');
  }
}
</script>
