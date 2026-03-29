<script setup lang="ts">
  import ToolCard from "./ToolCard.vue"
  import { useStateStore } from "@/stores/state"

  const myState = useStateStore();
</script>

<template>
    <div class="row">
      <div class="col-xs-12 col-sm-6 col-md-4 col-xl-3" v-for="tool in myState.tools" v-bind:key="tool.id">
        <ToolCard v-bind:tool="tool" />
      </div>
    </div>
</template>
