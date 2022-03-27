<template>
    <div class="container-sm d-flex flex-wrap flex-row">
        <ToolCard v-for="tool in this.$root.$data.shared.getTools()" v-bind:tool="tool" v-bind:key="tool.id" />

      <AddEditTool />
      <EditToolUsers />
      <ToolLog />
    </div>
</template>

<script>
import ToolCard from "./ToolCard.vue"
import AddEditTool from './AddEditTool.vue'
import EditToolUsers from './EditToolUsers.vue'
import ToolLog from './ToolLog.vue'

export default {
  name: 'Tools',
  components: {
    ToolCard,
    AddEditTool,
    EditToolUsers,
    ToolLog,
  },
    mounted() {
        console.log("Tools mounted");
    }
}
</script>