import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { useStateStore } from "@/stores/state"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('../components/TheWelcome.vue'),
      meta: {breadcrumb: {label: 'Home', to: '/'}},
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../components/LoginPage.vue'),
      meta: {breadcrumb: {label: 'Login', to: '/login'}},
    },
    {
      path: '/tools',
      meta: {breadcrumb: {label: 'Tools', to: '/tools'}},
      children: [
        {
          path: '',
          name: 'tool list',
          component: () => import('../components/ToolsPage.vue'),
          meta: {breadcrumb: {label:'Tool List', to: '/tools'}},
        },
        {
          path: ':id',
          name: 'tool',
          meta: {breadcrumb: (route: RouteLocationNormalized, state: ReturnType<typeof useStateStore>) => {
            const tool = state.findTool(+route.params.id);
            if (!tool) return {label: 'Unknown Tool', to: ''};
            return {label: tool.name, to: '/tools/' + tool.id};
          }},
          children: [
            {
              path: '',
              name: 'details',
              component: () => import('../components/ToolPage.vue'),
              meta: {breadcrumb: (route: RouteLocationNormalized, state: ReturnType<typeof useStateStore>) => {
                return {label: 'Details', to: '/tools/' + route.params.id}
              }}
            },
            {
              path: 'log',
              name: 'tool log',
              component: () => import('../components/ToolLogPage.vue'),
              meta: {breadcrumb: (route: RouteLocationNormalized, state: ReturnType<typeof useStateStore>) => {
                return {label: 'Log', to: '/tools/' + route.params.id + '/log'}
              }}
            },
            {
              path: 'users',
              name: 'tool users',
              component: () => import('../components/ToolUsersPage.vue'),
              meta: {breadcrumb: (route: RouteLocationNormalized, state: ReturnType<typeof useStateStore>) => {
                return {label: 'Users', to: '/tools/' + route.params.id + '/users'}
              }}
            },
          ]
        },
      ]
    },
    {
      path: '/users',
      name: 'users',
      meta: {breadcrumb: {label: 'Users',to: '/users'}},
      children: [
        {
          path: '',
          name: 'user list',
          component: () => import('../components/UsersPage.vue'),
          meta: {breadcrumb: {label: 'User List', to: '/users'}},
        },
        {
          path: ':id',
          name: 'user',
          meta: {breadcrumb: (route: RouteLocationNormalized, state: ReturnType<typeof useStateStore>) => {
            if (route.params.id === 'newuser') return {label: 'New User', to: '/users/newuser'}
            if (route.params.id === 'newgroup') return {label: 'New Group', to: '/users/newgroup'}
            const user = state.findUser(+route.params.id);
            if (!user) return {label: 'Unknown User', to: ''};
            return {label: user.fullName, to: '/users/' + user.id};
          }},
          children: [
            {
              path: '',
              name: 'user profile',
              component: () => import('../components/UserPage.vue'),
              meta: {breadcrumb: (route: RouteLocationNormalized, state: ReturnType<typeof useStateStore>) => {
                return {label: 'Profile', to: '/users/' + route.params.id}
              }}
            },
            {
              path: 'stats',
              name: 'user stats',
              component: () => import('../components/UserStats.vue'),
              meta: {breadcrumb: (route: RouteLocationNormalized, state: ReturnType<typeof useStateStore>) => {
                return {label: 'Stats', to: '/users/' + route.params.id + '/stats'};
              }}
            }
          ]
        }
      ]
    },
    {
      path: '/portalusers',
      name: 'portal users',
      meta: {breadcrumb: {label: 'Portal Users',to: '/portalusers'}},
      children: [
        {
          path: '',
          name: 'portal user list',
          component: () => import('../components/PortalUsers.vue'),
          meta: {breadcrumb: {label: 'Portal User List', to: '/portalusers'}},
        },
        {
          path: ':id',
          name: 'portal user',
          component: () => import('../components/PortalUserPage.vue'),
          meta: {breadcrumb: (route: RouteLocationNormalized, state: ReturnType<typeof useStateStore>) => {
            if (route.params.id === 'newuser') return {label: 'New User', to: '/portalusers/newuser'}
            const user = state.findPortalUser(+route.params.id);
            if (!user) return {label: 'Unknown User', to: ''};
            return {label: user.name, to: '/portalusers/' + user.id};
          }}
        }
      ]
    },
  ],
})

export default router
