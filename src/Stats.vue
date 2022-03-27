<template>
<div>
<ToolUtilChart :height="this.$root.$data.shared.tools.length * 50" />
</div>
    
</template>
<script>
import ToolUtilChart from './ToolUtilChart.vue';

export default {
  name: 'Stats',
  components: {
      ToolUtilChart
  },
  data () {return {
  }},
  methods: {
  }
}
</script>
