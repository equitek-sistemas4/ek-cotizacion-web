import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: {
        hideSidebar: true,
      },
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('../views/ChatView.vue'),
      meta: {
        icon: 'mdi-forum-outline',
        navLabel: 'Chats',
        showInNav: true,
      },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../views/UsersView.vue'),
      meta: {
        icon: 'mdi-account',
        navLabel: 'Usuarios',
        showInNav: true,
      },
    },
    {
      path: '/roles',
      name: 'roles',
      component: () => import('../views/RolesView.vue'),
      meta: {
        icon: 'mdi-shield-account-outline',
        navLabel: 'Roles',
        showInNav: true,
      },
    },
    {
      path: '/contacts',
      name: 'contacts',
      component: () => import('../views/ContactsView.vue'),
      meta: {
        icon: 'mdi-contacts',
        navLabel: 'Contactos',
        showInNav: true,
      },
    },
    {
      path: '/contact-requests',
      name: 'contact-requests',
      component: () => import('../views/contactRequests.vue'),
      meta: {
        icon: 'mdi-account-clock-outline',
        navLabel: 'Solicitudes contacto',
        showInNav: true,
      },
    },
    {
      path: '/contact-chat/:access_code',
      name: 'contact-chat',
      component: () => import('../views/ContactChatView.vue'),
      meta: {
        hideSidebar: true,
      },
    },
  ],
})

export default router
