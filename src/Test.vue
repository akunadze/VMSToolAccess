<template>
    <div>
        <div v-for="tool in shared.getTools()" v-bind:key="tool.id">
            <div class="row">
                <div class="col">
                    {{tool.name}}
                </div>
                <div class="col">
                    <b-dropdown>
                        <b-dropdown-item-button @click="selectUser(tool, null)">
                            No user
                        </b-dropdown-item-button>
                        <b-dropdown-item-button v-for="user in shared.getUsers()" v-bind:key="user.userName" @click="selectUser(tool, user)">
                            {{user.fullName}}
                        </b-dropdown-item-button>
                    </b-dropdown>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
import './Test.js'

export default {
  name: 'Test',
  data() {return {
      shared: this.$root.$data.shared
  }},
  components: {
  },
  methods:{
      selectUser(tool, user) {
          if (user) {
            this.toolLogon(tool.id, user.id).then(x => x ? alert(x):"")
          } else {
            this.toolLogout(tool.id).then(x => x ? alert(x):"")
          }
          
          //this.$root.refreshTools();
          //tool.currentUser = user ? user.userName : ""
      },
      async toolLogon(toolId, userId) {
        let resp = await fetch(`/api/tool/logon`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({toolId: toolId, userId: userId})
        });
        console.log(resp);
        return resp.ok ? null : resp.statusText;
      },
      async toolLogout(toolId) {
        let resp = await fetch(`/api/tool/logout`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({toolId: toolId})
            });
            return resp.ok ? null : resp.statusText;
      }
  }
}
</script>

