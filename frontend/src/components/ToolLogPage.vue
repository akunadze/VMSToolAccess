<script setup lang="ts">
  import { computed } from "vue"
  import { useRoute } from "vue-router";
  import { useTools } from "@/composables/useTools";
  import { useUsers } from "@/composables/useUsers";
  import { useToolLog } from "@/composables/useToolMutations";
  import { formatSeconds } from "@/types";
  import type { LogEntryData } from "@/types";

  const toolId = useRoute().params.id as string;

  if (!toolId || Number.isNaN(+toolId)) {
    throw new Error("Tool ID is required");
  }

  const { findTool } = useTools();
  const { getLogEntryDisplayName } = useUsers();
  const { data: logData } = useToolLog(+toolId);

  const tool = computed(() => findTool(+toolId));
  const log = computed(() => logData.value ?? []);

  function formatTimestamp(ts: number) {
      const dt = new Date(ts * 1000);
      return dt.toLocaleString();
  }

  function getSpindleTimeText(entry: LogEntryData) {
    if (entry.op === 'out' && entry.spindleTime > 0) {
      return '(' + formatSeconds(entry.spindleTime) + ')';
    }
    return '';
  }

  function onPrint() {
    if (!log.value.length) return;

    const toolName = tool.value?.name ?? '';
    const contents = [`<html><body><b>${toolName} log</b><table border="1px"><thead><tr><th></th><th>User</th><th>Spindle Time</th><th>Timestamp</th></tr></thead><tbody>`];
    log.value.forEach((x) => {
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

      const user = getLogEntryDisplayName(x);
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
      <li class="list-group-item" v-for="entry in log" v-bind:key="entry.timestamp">
        <div class="row">
          <div class="col-1">
            <i class="bi bi-arrow-right-circle-fill text-success" v-if="entry.op === 'in'"/>
            <i class="bi bi-arrow-left-circle-fill text-warning" v-if="entry.op === 'out'" />
            <i class="bi bi-exclamation-circle-fill text-danger" v-if="entry.op === 'err'" />
          </div>
          <div class="col-4">
            {{getLogEntryDisplayName(entry)}} {{getSpindleTimeText(entry)}}
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
