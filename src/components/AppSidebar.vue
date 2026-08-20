<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { getUnreadNotifications, readNotifications } from '@/services/notifications'
import { useAuthStore } from '@/stores/auth'
import logoImg from '@/assets/logo.png'

const router = useRouter()
const route = useRoute()
const theme = useTheme()
const authStore = useAuthStore()
const collapsed = ref(false)
const logoUrl = logoImg
const unreadNotifications = ref([])
let unreadNotificationsInterval = null

const loggedUserName = computed(() => authStore.user?.name || authStore.user?.email || 'Usuario')
const isDarkTheme = computed(() => theme.global.name.value === 'dark')
const themeToggleLabel = computed(() =>
  isDarkTheme.value ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
)

const toggleTheme = () => {
  const nextTheme = isDarkTheme.value ? 'light' : 'dark'

  theme.global.name.value = nextTheme
  localStorage.setItem('theme', nextTheme)
}

const navigationItems = computed(() =>
  router
    .getRoutes()
    .filter((route) => route.meta.showInNav)
    .map((route) => ({
      icon: route.meta.icon,
      label: route.meta.navLabel,
      name: route.name,
      path: route.path,
    })),
)

const unreadNotificationCounts = computed(() =>
  unreadNotifications.value.reduce((counts, notification) => {
    const section = notification.section

    if (section) {
      counts[section] = (counts[section] ?? 0) + 1
    }

    return counts
  }, {}),
)

const loadUnreadNotifications = async () => {
  if (!authStore.userId) {
    unreadNotifications.value = []
    return
  }

  try {
    const notifications = await getUnreadNotifications(authStore.userId)
    const activeSection = typeof route.name === 'string' ? route.name : null

    unreadNotifications.value = notifications

    if (!activeSection || !notifications.some((notification) => notification.section === activeSection)) {
      return
    }

    try {
      await readNotifications({
        user_id: authStore.userId,
        section: activeSection,
      })

      unreadNotifications.value = notifications.filter(
        (notification) => notification.section !== activeSection,
      )
    } catch {
      // El badge permanece oculto mientras el usuario se encuentre en esta sección.
    }
  } catch {
    unreadNotifications.value = []
  }
}

const markNotificationsAsRead = async (section) => {
  if (!authStore.userId || !unreadNotificationCounts.value[section]) {
    return
  }

  try {
    await readNotifications({
      user_id: authStore.userId,
      section,
    })

    unreadNotifications.value = unreadNotifications.value.filter(
      (notification) => notification.section !== section,
    )
  } catch {
    // Se conserva el badge para reflejar que las notificaciones siguen pendientes.
  }
}

const getUnreadNotificationCount = (section) => {
  if (route.name === section) {
    return 0
  }

  return unreadNotificationCounts.value[section] ?? 0
}

const logout = () => {
  router.push('/login')
}

onMounted(() => {
  const storedTheme = localStorage.getItem('theme')

  if (storedTheme === 'light' || storedTheme === 'dark') {
    theme.global.name.value = storedTheme
  }

  loadUnreadNotifications()
  unreadNotificationsInterval = setInterval(loadUnreadNotifications, 60_000)
})

onBeforeUnmount(() => {
  clearInterval(unreadNotificationsInterval)
})
</script>

<template>
  <v-navigation-drawer
    class="app-sidebar"
    color="surface"
    permanent
    :rail="collapsed"
    :width="248"
  >
    <div class="sidebar-content">
      <div class="brand-section">
        <v-avatar class="brand-logo" color="primary" rounded="lg" size="40">
          <v-img v-if="logoUrl" :src="logoUrl" alt="Equitek" cover />
          <span v-else>EQ</span>
        </v-avatar>

        <span v-if="!collapsed" class="brand-name">Equitek</span>
      </div>

      <v-btn
        class="collapse-button"
        color="primary"
        :icon="collapsed ? 'mdi-chevron-right' : 'mdi-chevron-left'"
        size="small"
        variant="text"
        @click="collapsed = !collapsed"
      />

      <v-list class="nav-list" density="compact" nav>
        <v-list-item
          v-for="item in navigationItems"
          :key="item.name"
          :prepend-icon="item.icon"
          :title="item.label"
          :to="item.path"
          color="primary"
          rounded="lg"
          @click="markNotificationsAsRead(item.name)"
        >
          <template #append>
            <v-badge
              v-if="getUnreadNotificationCount(item.name)"
              :content="getUnreadNotificationCount(item.name)"
              color="primary"
              inline
            />
          </template>
        </v-list-item>
      </v-list>

      <v-spacer />

      <v-list class="logout-list" density="compact" nav>
        <v-tooltip :text="themeToggleLabel" location="end">
          <template #activator="{ props }">
            <v-list-item
              v-bind="props"
              color="primary"
              :prepend-icon="isDarkTheme ? 'mdi-weather-sunny' : 'mdi-weather-night'"
              rounded="lg"
              :title="collapsed ? undefined : themeToggleLabel"
              @click="toggleTheme"
            />
          </template>
        </v-tooltip>
        <v-list-item
          v-if="!collapsed"
          :title="loggedUserName"
          prepend-icon="mdi-account-circle"
          rounded="lg"
        />
        <v-list-item
          color="primary"
          prepend-icon="mdi-logout"
          rounded="lg"
          title="Cerrar sesion"
          @click="logout"
        />
      </v-list>
    </div>
  </v-navigation-drawer>
</template>

<style scoped>
.app-sidebar {
  border-right: 1px solid rgb(var(--v-theme-border));
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 14px 10px;
}

.brand-section {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 4px 6px;
}

.brand-logo {
  flex: 0 0 auto;
  color: rgb(var(--v-theme-surface));
  font-weight: 700;
}

.brand-name {
  color: rgb(var(--v-theme-textPrimary));
  font-size: 1.15rem;
  font-weight: 700;
}

.collapse-button {
  align-self: flex-end;
  margin: 8px 0 18px;
}

.nav-list,
.logout-list {
  padding: 0;
}
</style>
