import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './App.vue';
import Login from './Login.vue';
import Tools from './Tools.vue';
import Users from './Users.vue';
import Settings from './Settings.vue';
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue';
import vMultiselectListbox from "vue-multiselect-listbox";
import 'core-js/stable'; 
import 'regenerator-runtime/runtime';

// Import Bootstrap an BootstrapVue CSS files (order is important)
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';
import 'vue-multiselect-listbox/dist/vue-multi-select-listbox.css';

Vue.use(VueRouter);

let loggedIn = false;

const router = new VueRouter({routes: [
  {path: "/", redirect: "/login"},
  {path: "/tools", name: "tools", component: Tools},
  {path: "/users", name: "users", component: Users},
  {path: "/login", name: "login", component: Login},
  {path: "/settings", name: "settings", component: Settings},
]
});

router.beforeEach((to, from, next) => {
  if (!loggedIn && to.path !== '/login') {
    next('/login');
  } else {
    next();
  }
});


// Make BootstrapVue available throughout your project
Vue.use(BootstrapVue);
// Optionally install the BootstrapVue icon components plugin
Vue.use(IconsPlugin)
Vue.component("v-multiselect-listbox", vMultiselectListbox);

class Data {
  constructor() {
    this.users = [];
    this.tools = [];
    this.inModal = false;
    this.updatePending = false;
  }

  getTools() {
    return this.tools;
  }

  getUsers() {
    return this.users;
  }
  
  findUser(userId) {
    return this.users.find(x => x.id === userId);
  }

  enterModal() {
    if (this.inModal) {
      return false;
    }

    this.inModal = true;
    return true;
  }

  exitModal() {
    if (!this.inModal) {
      console.log("!!!Modal State Mismatch");
    }

    this.inModal = false;

    if (this.updatePending) {
      this.updatePending = false;
      refreshData();
    }
    return;
  }
}

let sharedState = new Data();
let inRefresh = false;

function refreshData() {
  if (sharedState.inModal || inRefresh) {
    console.log('Deferring refresh...');
    sharedState.updatePending = true;
    return;
  }

  inRefresh = true;
  
  fetch('/api/users').then(resp => {
    if (resp.ok) {
      resp.json().then(j => sharedState.users = j.data);
    }
  }).catch(e => {
    console.log("Error fetching /api/users: " + e);
  });

  fetch('/api/tools').then(resp => {
    if (resp.ok) {
      resp.json().then(j => sharedState.tools = j.data);
    }
  }).catch(e => {
    console.log("Error fetching /api/tools: " + e);
  });

  inRefresh = false;
}

let vueApp = new Vue({
  router,
  // el: '#app',
  data () { return {
    shared: sharedState,
  }},
  methods: {
    async login(user, pass) {
      let resp = await fetch(`/api/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({user: user, password: pass})
      });
      let respJson = await resp.json();
      return (resp.status === 200 && !respJson.error);
    },
    async logout() {
      await fetch(`/api/logout`);
    },
    async changeAdminPass(oldPass, newPass) {
      let resp = await fetch(`/api/changePassword`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({oldPass: oldPass, newPass: newPass})
      });
      let respJson = await resp.json();
      return (resp.status === 200 && !respJson.error);
    },
    setLoggedIn(b) {
      loggedIn = b;
    },
    isLoggedIn() {
      return loggedIn;
    },
    getUserFullName(userId) {
      let user = this.shared.findUser(userId);
      return user ? user.fullName : "<user not found>";
    },
    getLogEntryDisplayName(entry) {
      let user = this.$data.shared.findUser(entry.userId);
      
      return user ? user.fullName : "Card #" + entry.card;
    },
    async editTool(tool, newName) {
      let resp = await fetch(`/api/tool/edit`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({toolId: tool.id, toolName: newName})
      });
      let respJson = await resp.json();
      return (resp.status === 200 && !respJson.error);
    },
    async editToolUsers(tool, newUsers) {
      let resp = await fetch(`/api/tool/edit`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({toolId: tool.id, toolUsers: newUsers})
      });
      let respJson = await resp.json();
      return (resp.status === 200 && !respJson.error);
    },
    async addUser(name, email, card) {
      let resp = await fetch(`/api/user/add`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: name, email: email, card: card})
      });
      let respJson = await resp.json();
      return (resp.status === 200 && !respJson.error);
    },
    async editUser(userId, name, email, card) {
      let resp = await fetch(`/api/user/edit`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: userId, name: name, email: email, card: card})
      });
      let respJson = await resp.json();
      return (resp.status === 200 && !respJson.error);
    },
    async deleteTool(toolId) {
      let resp = await fetch(`/api/tool/delete`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: toolId})
      });
      let respJson = await resp.json();
      return (resp.status === 200 && !respJson.error);
    },
    async deleteUser(userId) {
      let resp = await fetch(`/api/user/delete`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: userId})
      });
      let respJson = await resp.json();
      return (resp.status === 200 && !respJson.error);
    },
    refreshData() {
      refreshData();
    }
  },
  render: h => h(App),
  }).$mount('#app');

  refreshData();

  let url = new URL(window.location);
  url.protocol = 'wss:';
  url.pathname = '/ws';
  url.hash = '';

  function onSocketMessage(ev) {
    if (ev.data === "update") {
      refreshData();
    } else {
      vueApp.$emit("card", ev.data);
    }
  }
  
  function onSocketClose(ev) {
    console.log("Websocket closed");
    let ws2 = null;
    let timerId = setInterval(function () {
        console.log("Trying to reconnect web socket");
        ws2 = new WebSocket(url);

        if (ws2) {
          clearInterval(timerId);
          ws2.onmessage = onSocketMessage;
          ws2.onclose = onSocketClose;
        }
    }, 1000);
  }

  let ws = new WebSocket(url);

  ws.onmessage = onSocketMessage;
  ws.onclose = onSocketClose;
