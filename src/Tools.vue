<template>
    <div class="container-sm d-flex flex-wrap flex-row">
        <ToolCard v-for="tool in this.$root.$data.shared.getTools()" v-bind:tool="tool" v-bind:key="tool.id" />
    </div>
</template>

<script>
import ToolCard from "./ToolCard.vue"

export default {
  name: 'Tools',
  components: {
    ToolCard
  },
    mounted() {
        console.log("Tools mounted");
    }
}
</script>