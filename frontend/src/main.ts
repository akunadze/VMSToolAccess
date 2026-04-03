import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin, QueryClient, QueryCache } from '@tanstack/vue-query'
import { useAuthStore } from "@/stores/auth"

import App from './App.vue'
import router from './router'

import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap/dist/css/bootstrap-utilities.min.css"
import "bootstrap-icons/font/bootstrap-icons.min.css"
import 'bootstrap-icons/font/bootstrap-icons.css'
import "bootstrap"

console.log('Creating app...');

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onSuccess: (_data, query) => console.log('Query fetched:', query.queryKey),
  }),
});

const app = createApp(App)

app.use(createPinia())
app.use(VueQueryPlugin, { queryClient })
app.use(router)

router.beforeEach((to, from, next) => {
  const auth = useAuthStore();

  if (!auth.isLoggedIn() && to.path !== '/login') {
    next('/login');
  } else {
    next();
  }
});

app.provide('app', app)

app.mount('#app')

const url = new URL(window.location.href);
url.pathname = '/ws';
url.hash = '';

function onSocketMessage(ev: MessageEvent) {
  if (ev.data === "update") {
    queryClient.invalidateQueries();
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
