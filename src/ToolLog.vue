<template>
    <b-modal id="toolLogDlg" :title="title" @hidden="onHide">
      <template #modal-footer="{ close }">
        <b-button size="sm" variant="outline-dark" class="mr-auto align-items-start" @click="onPrint">
          <b-icon icon="printer"></b-icon>
        </b-button>
        <b-button size="sm" variant="outline-dark" class="ml-2" @click="close()">
          Close
        </b-button>
      </template>
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
                {{getUserFullName(entry)}} {{getSpindleTimeText(entry)}}
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
    getSpindleTimeText(entry) {
      if (entry.op === 'out' && entry.spindleTime > 0) {
        return '(' + this.$root.formatSeconds(entry.spindleTime) + ')';
      }

      return '';
    },
    formatTimestamp(ts) {
      let dt = new Date(ts * 1000);
      return dt.toLocaleString();
    },
    onPrint() {
      let toolName = this.tool.name;
      let contents = [`<html><body><b>${toolName} log</b><table border="1px"><thead><tr><th></th><th>User</th><th>Spindle Time</th><th>Timestamp</th></tr></thead><tbody>`];
      this.log.forEach((x) => {
        let op = "";
        let color = "";

        if (x.op === 'in') {
          op = "=>";
          color = "green";
        } else if (x.op === 'out') {
          op = "<=";
          color = "yellow";
        } else if (x.op === 'err') {
          op = "!!";
          color = "red";
        }

        let user = this.getUserFullName(x);
        let timestamp = this.formatTimestamp(x.timestamp);
        let spindleTime = this.getSpindleTimeText(x);

        contents.push(`<tr><td style="background:${color}">${op}</td><td>${user}</td><td>${spindleTime}</td><td>${timestamp}</td></tr>`);
      });
      contents.push("</tbody></table></body></html>")

      var WinPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
      WinPrint.document.write(contents.join(""));
      WinPrint.document.close();
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
