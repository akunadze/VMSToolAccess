<template>
  <div id="app" class="container-fluid border h-100 d-flex flex-column">
      <div class="border row flex-grow-1 p-1">
          <div class="col-4 border d-flex p-2">
              <div class="container-fluid border flex-grow-1">
                  
              </div>
          </div>
          <div class="col-8 border"></div>
      </div>
  </div>
</template>

<script>
import ToolCard from './ToolCard.vue'
import EditToolUsers from './EditToolUsers.vue'
import AddEditTool from './AddEditTool.vue'
import Users from './Users.vue'
import Test from './Test.vue'

export default {
  name: 'app',
  data() {return {
    checkedNames: [],
    name: '',
    nameState: null,
    nameError: 'Name is required'
  }},
  components: {
    ToolCard,
    AddEditTool,
    EditToolUsers,
    Users,
    Test
  },
  methods:{
    onToolAdd() {
      this.$root.$emit('edit-tool')
    }
    // onRemove() {
    //   this.users = this.users.filter(x => !this.checkedNames.includes(x.username))
    // }
  },
  mounted() {
    console.log('===========Test============');
    console.log(this.$route);
  }
}
</script>
<style>
html,body {
  height:99%;
}
</style>

