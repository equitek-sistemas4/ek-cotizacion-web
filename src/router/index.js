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
