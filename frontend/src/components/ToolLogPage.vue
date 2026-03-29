<script setup lang="ts">
  import { ref, watch } from "vue"
  import { useStateStore, type LogEntryData } from "@/stores/state"
  import { useRoute } from "vue-router";

  const myState = useStateStore();

  const toolId = useRoute().params.id as string;

  if (!toolId || Number.isNaN(+toolId)) {
    throw new Error("Tool ID is required");
  }

  const tool = ref(myState.tools.find(t => t.id === +toolId));

  watch(() => myState.tools, () => {
    tool.value = myState.findTool(+toolId);
  });

  function getTool() {
    return tool.value!;
  }

  function formatTimestamp(ts: number) {
      const dt = new Date(ts * 1000);
      return dt.toLocaleString();
  }

  function getSpindleTimeText(entry: LogEntryData) {
    if (entry.op === 'out' && entry.spindleTime > 0) {
      return '(' + myState.formatSeconds(entry.spindleTime) + ')';
    }

    return '';
  }

  function onPrint() {
    if (!getTool() || !getTool().log) {
      return;
    }

    const toolName = getTool().name;
    const contents = [`<html><body><b>${toolName} log</b><table border="1px"><thead><tr><th></th><th>User</th><th>Spindle Time</th><th>Timestamp</th></tr></thead><tbody>`];
    getTool().log.forEach((x) => {
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

      const user = myState.getLogEntryDisplayName(x);
      const timestamp = formatTimestamp(x.timestamp);
      const spindleTime = getSpindleTimeText(x);

      contents.push(`<tr><td style="background:${color}">${op}</td><td>${user}</td><td>${spindleTime}</td><td>${timestamp}</td></tr>`);
    });
    contents.push("</tbody></table></body></html>")

    const WinPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    if (!WinPrint) {
      console.error("Failed to open print window");
      return;
    }
    WinPrint.document.body.innerHTML = contents.join("");
    WinPrint.document.close();
  }

</script>

<template>
  <div class="d-flex flex-column flex-grow-1 border overflow-y-scroll" v-if="tool">
    <ul class="list-group">
      <li class="list-group-item" v-for="entry in getTool()!.log" v-bind:key="entry.timestamp">
        <div class="row">
          <div class="col-1">
            <i class="bi bi-arrow-right-circle-fill text-success" v-if="entry.op === 'in'"/>
            <i class="bi bi-arrow-left-circle-fill text-warning" v-if="entry.op === 'out'" />
            <i class="bi bi-exclamation-circle-fill text-danger" v-if="entry.op === 'err'" />
          </div>
          <div class="col-4">
            {{myState.getLogEntryDisplayName(entry)}} {{getSpindleTimeText(entry)}}
          </div>
          <div class="col">
            {{formatTimestamp(entry.timestamp)}}
          </div>
        </div>
      </li>
    </ul>
  </div>
  <div class="modal-footer mt-2">
    <button type="button" class="btn btn-outline-dark me-auto" @click="onPrint()">
      <i class="bi bi-printer"></i>
    </button>
  </div>
</template>
