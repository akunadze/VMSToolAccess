import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useStateStore } from "@/stores/state"

import App from './App.vue'
import router from './router'
// import ToolLog from '@/components/ToolLog.vue'

import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap/dist/css/bootstrap-utilities.min.css"
import "bootstrap-icons/font/bootstrap-icons.min.css"
import 'bootstrap-icons/font/bootstrap-icons.css'
import "bootstrap"

// interface ToolData {
//     id: number;
//     name: string;
//     mac: string;
//     lockedout: number;
// }

// interface UserData {
//     id: number;
//     fullName: string;
//     email: string;
//     card: string;
//     doorCard: string;
//     isGroup: boolean;
// }

// class Data {

//     getTools() {
//         return this.tools;
//     }

//     getUsers() {
//         return this.users;
//     }

//     findUser(userId:number) {
//         return this.users.find(x => x.id === userId);
//     }

//     enterModal() {
//         if (this.inModal) {
//             return false;
//         }

//         this.inModal = true;
//         return true;
//     }

//     exitModal() {
//         if (!this.inModal) {
//             console.log("!!!Modal State Mismatch");
//         }

//         this.inModal = false;

//         if (this.updatePending) {
//             this.updatePending = false;
//             refreshData();
//         }
//         return;
//     }
// }

// let sharedState = new Data();

// let vueApp = new Vue({
//     router,
//     // el: '#app',
//     data () { return {
//       shared: sharedState,
//     }},
//     methods: {
//       async login(user, pass) {
//         let resp = await fetch(`/api/login`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({user: user, password: pass})
//         });
//         let respJson = await resp.json();
//         return (resp.status === 200 && !respJson.error);
//       },
//       async logout() {
//         await fetch(`/api/logout`);
//       },
//       async changeAdminPass(oldPass, newPass) {
//         let resp = await fetch(`/api/changePassword`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({oldPass: oldPass, newPass: newPass})
//         });
//         let respJson = await resp.json();
//         return (resp.status === 200 && !respJson.error);
//       },
//       setLoggedIn(b) {
//         loggedIn = b;
//       },
//       isLoggedIn() {
//         return loggedIn;
//       },
//       getUserFullName(userId) {
//         let user = this.shared.findUser(userId);
//         return user ? user.fullName : "<user not found>";
//       },
//       getLogEntryDisplayName(entry) {
//         let user = this.$data.shared.findUser(entry.userId);

//         return user ? user.fullName : "Card #" + entry.card;
//       },
//       async editTool(tool, newName) {
//         let resp = await fetch(`/api/tool/edit`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({toolId: tool.id, toolName: newName})
//         });
//         let respJson = await resp.json();
//         return (resp.status === 200 && !respJson.error);
//       },
//       async editToolUsers(tool, newUsers) {
//         let resp = await fetch(`/api/tool/edit`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({toolId: tool.id, toolUsers: newUsers})
//         });
//         let respJson = await resp.json();
//         return (resp.status === 200 && !respJson.error);
//       },
//       async addUser(name, email, card, doorCard, members) {
//         console.log("addUser: " + name + ", " + email + ", " + card + ", " + doorCard);
//         let resp = await fetch(`/api/user/add`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({name: name, email: email, card: card, doorCard: doorCard, members: members})
//         });
//         let respJson = await resp.json();
//         return (resp.status === 200 && !respJson.error);
//       },
//       async editUser(userId, name, email, card, doorCard, members) {
//         console.log("editUser: " + name + ", " + email + ", " + card + ", " + doorCard);
//         let resp = await fetch(`/api/user/edit`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({id: userId, name: name, email: email, card: card, doorCard: doorCard, members: members})
//         });
//         let respJson = await resp.json();
//         return (resp.status === 200 && !respJson.error);
//       },
//       async deleteTool(toolId) {
//         let resp = await fetch(`/api/tool/delete`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({id: toolId})
//         });
//         let respJson = await resp.json();
//         return (resp.status === 200 && !respJson.error);
//       },
//       async deleteUser(userId) {
//         let resp = await fetch(`/api/user/delete`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({id: userId})
//         });
//         let respJson = await resp.json();
//         return (resp.status === 200 && respJson.error === null);
//       },
//       async setToolLockout(toolId, lockout) {
//         let resp = await fetch(`/api/tool/setlockout`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({id: toolId, islocked: lockout})
//         });
//         let respJson = await resp.json();
//         return (resp.status === 200 && !respJson.error);
//       },
//       refreshData() {
//         refreshData();
//       }
//     },
//     render: h => h(App),
// }).$mount('#app');

console.log('Creating app...');

const app = createApp(App)

app.use(createPinia())
app.use(router)

router.beforeEach((to, from, next) => {
  const myState = useStateStore();

  if (!myState.isLoggedIn() && to.path !== '/login') {
    next('/login');
  } else {
    next();
  }
});

app.provide('app', app)

app.mount('#app')

const myState = useStateStore();

const url = new URL(window.location.href);
//url.protocol = 'wss:';
url.pathname = '/ws';
url.hash = '';

function onSocketMessage(ev: MessageEvent) {
  if (ev.data === "update") {
    myState.refreshData();
  }
}

function onSocketClose() {
  console.log("Websocket closed");
  let ws2 = null;
  const timerId = setInterval(function () {
      console.log("Trying to reconnect web socket");
      ws2 = new WebSocket(url);

      if (ws2) {
        clearInterval(timerId);
        ws2.onmessage = onSocketMessage;
        ws2.onclose = onSocketClose;
      }
  }, 1000);
}

const ws = new WebSocket(url);

ws.onmessage = onSocketMessage;
ws.onclose = onSocketClose;
