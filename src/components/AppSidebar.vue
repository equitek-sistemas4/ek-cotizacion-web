<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import { getUnreadNotifications, readNotifications } from '@/services/notifications'
import { useAuthStore } from '@/stores/auth'
import logoImg from '@/assets/ek-logo.png'

const router = useRouter()
const route = useRoute()
const theme = useTheme()
const { xs } = useDisplay()
const authStore = useAuthStore()
const collapsed = ref(false)
const mobileMenuOpen = ref(false)
const logoUrl = logoImg
const unreadNotifications = ref([])
const notificationAlertVisible = ref(false)
const notificationAlertMessage = ref('')
const notificationAlertKey = ref(0)
let unreadNotificationsInterval = null
let previousUnreadNotificationKeys = new Set()
let previousUnreadNotificationCount = 0

const loggedUserName = computed(() => authStore.user?.name || authStore.user?.email || 'Usuario')
const isDarkTheme = computed(() => theme.global.name.value === 'dark')
const isMobile = computed(() => xs.value)
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
    .filter((route) => {
      if (!route.meta.showInNav) return false

      const allowedUserTypes = route.meta.allowedUserTypes
      const userType = Number(authStore.user?.idtipo_usuario)

      return !allowedUserTypes || allowedUserTypes.includes(userType)
    })
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

const getNotificationKey = (notification, index) =>
  String(
    notification.id ??
      `${notification.section ?? ''}-${notification.chat_id ?? ''}-${notification.created_at ?? index}`,
  )

const notificationSectionLabels = {
  'contact-requests': 'Solicitudes de contacto',
}

const showNotificationAlert = (notifications) => {
  const notificationKeys = new Set(notifications.map(getNotificationKey))
  const hasNewNotification =
    notifications.length > previousUnreadNotificationCount ||
    [...notificationKeys].some(
      (notificationKey) => !previousUnreadNotificationKeys.has(notificationKey),
    )

  if (notifications.length && hasNewNotification) {
    const sections = [
      ...new Set(
        notifications
          .map((notification) => notification.section)
          .filter((section) => typeof section === 'string' && section.trim()),
      ),
    ].map((section) => notificationSectionLabels[section] ?? section)
    const sectionMessage = sections.length ? ` en ${sections.join(', ')}.` : ''

    notificationAlertMessage.value =
      notifications.length === 1
        ? `Tienes una notificación pendiente ${sectionMessage}`
        : `Tienes ${notifications.length} notificaciones pendientes.${sectionMessage}`
    notificationAlertKey.value += 1
    notificationAlertVisible.value = true
  }

  previousUnreadNotificationKeys = notificationKeys
  previousUnreadNotificationCount = notifications.length
}

const loadUnreadNotifications = async () => {
  if (!authStore.userId) {
    unreadNotifications.value = []
    notificationAlertVisible.value = false
    previousUnreadNotificationKeys = new Set()
    previousUnreadNotificationCount = 0
    return
  }

  try {
    const notifications = await getUnreadNotifications(authStore.userId)
    const activeSection = typeof route.name === 'string' ? route.name : null

    unreadNotifications.value = notifications
    showNotificationAlert(notifications)

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
  mobileMenuOpen.value = false
  router.push('/login')
}

const handleNavigationClick = (item) => {
  if (item.name === 'contact-requests') {
    markNotificationsAsRead(item.name)
  }

  mobileMenuOpen.value = false
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
  <v-snackbar
    :key="notificationAlertKey"
    v-model="notificationAlertVisible"
    color="warning"
    location="top end"
    timeout="20000"
  >
    <v-icon class="mr-2" icon="mdi-bell-alert-outline" />
    {{ notificationAlertMessage }}
  </v-snackbar>

  <v-navigation-drawer
    v-if="!isMobile"
    class="app-sidebar"
    color="surface"
    permanent
    :rail="collapsed"
    :width="248"
  >
    <div class="sidebar-content">
      <div class="brand-section">
        <v-avatar class="brand-logo" rounded="lg" size="40">
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

      <div v-if="!collapsed" class="user-identity">
        <div class="user-identity__icon">
          <v-icon icon="mdi-account-circle" size="26" />
        </div>
        <span class="user-identity__name">{{ loggedUserName }}</span>
      </div>

      <br>

      <v-list class="nav-list" density="compact" nav>
        <v-list-item
          v-for="item in navigationItems"
          :key="item.name"
          :prepend-icon="item.icon"
          :title="item.label"
          :to="item.path"
          color="primary"
          rounded="lg"
          @click="handleNavigationClick(item)"
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
        <v-list-item
          class="utility-item theme-item"
          color="primary"
          :prepend-icon="isDarkTheme ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          rounded="lg"
          :title="collapsed ? undefined : themeToggleLabel"
          @click="toggleTheme"
        />
        <v-list-item
          class="utility-item logout-item"
          color="primary"
          prepend-icon="mdi-logout"
          rounded="lg"
          title="Cerrar sesion"
          @click="logout"
        />
      </v-list>
    </div>
  </v-navigation-drawer>

  <v-app-bar v-else class="mobile-header" color="surface" elevation="0">
    <div class="mobile-header__content">
      <div class="brand-section mobile-brand-section">
        <v-avatar class="brand-logo" rounded="lg" size="40">
          <v-img v-if="logoUrl" :src="logoUrl" alt="Equitek" cover />
          <span v-else>EQ</span>
        </v-avatar>

        <span class="brand-name">Equitek</span>
      </div>

      <v-menu
        v-model="mobileMenuOpen"
        class="mobile-navigation-menu"
        :close-on-content-click="false"
        location="bottom end"
        offset="10"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            aria-label="Abrir menú de navegación"
            icon="mdi-menu"
            variant="text"
          />
        </template>

        <v-card class="mobile-navigation-card" color="surface">
          <div class="user-identity mobile-user-identity">
            <div class="user-identity__icon">
              <v-icon icon="mdi-account-circle" size="26" />
            </div>
            <span class="user-identity__name">{{ loggedUserName }}</span>
          </div>

          <v-list class="nav-list" density="compact" nav>
            <v-list-item
              v-for="item in navigationItems"
              :key="item.name"
              :prepend-icon="item.icon"
              :title="item.label"
              :to="item.path"
              color="primary"
              rounded="lg"
              @click="handleNavigationClick(item)"
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

          <v-divider class="mobile-navigation-divider" />

          <v-list class="logout-list" density="compact" nav>
            <v-list-item
              class="utility-item theme-item"
              color="primary"
              :prepend-icon="isDarkTheme ? 'mdi-weather-sunny' : 'mdi-weather-night'"
              rounded="lg"
              :title="themeToggleLabel"
              @click="toggleTheme"
            />
            <v-list-item
              class="utility-item logout-item"
              color="primary"
              prepend-icon="mdi-logout"
              rounded="lg"
              title="Cerrar sesión"
              @click="logout"
            />
          </v-list>
        </v-card>
      </v-menu>
    </div>
  </v-app-bar>
</template>

<style scoped>
.app-sidebar {
  border-right: 1px solid rgb(var(--v-theme-border));
}

.mobile-header {
  border-bottom: 1px solid rgb(var(--v-theme-border));
}

.mobile-header__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 12px;
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

.app-sidebar,
.brand-name,
.nav-list,
.logout-list {
  font-family: 'Roboto', 'Helvetica Neue', sans-serif;
}

.brand-name {
  color: rgb(var(--v-theme-textPrimary));
  font-size: 1.15rem;
  font-weight: 700;
}

.mobile-brand-section {
  padding: 4px 0;
}

.collapse-button {
  align-self: flex-end;
  margin: 8px 0 18px;
}

.nav-list,
.logout-list {
  padding: 0;
}

.nav-list :deep(.v-list-item) {
  border-radius: 14px;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.nav-list :deep(.v-list-item:hover) {
  background: rgba(var(--v-theme-primary), 0.08);
  transform: translateX(2px);
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.08);
}

.nav-list :deep(.v-list-item-title),
.logout-list :deep(.v-list-item-title) {
  font-family: 'Roboto', 'Helvetica Neue', sans-serif;
  font-size: 0.83rem;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.user-identity {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 12px;
  margin: 4px 0 8px;
  border: 1px solid rgba(var(--v-theme-border), 0.8);
  border-radius: 14px;
  background: rgba(var(--v-theme-primary), 0.02);
  color: rgb(var(--v-theme-textPrimary));
  cursor: default;
  user-select: none;
}

.user-identity__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: rgba(var(--v-theme-primary), 0.06);
  color: rgb(var(--v-theme-primary));
}

.user-identity__name {
  overflow: hidden;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.utility-item {
  margin: 4px 0;
  border-radius: 14px;
  transition: all 0.2s ease;
}

.utility-item:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}

.theme-item,
.logout-item {
  border: 1px solid rgba(var(--v-theme-border), 0.8);
}

.theme-item {
  background: rgba(var(--v-theme-primary), 0.04);
}

.logout-item {
  background: rgba(var(--v-theme-secondary), 0.08);
  border-color: rgba(var(--v-theme-secondary), 0.2);
  color: rgb(var(--v-theme-secondary));
}

.logout-item :deep(.v-list-item-title),
.logout-item :deep(.v-list-item__prepend) {
  color: rgb(var(--v-theme-secondary));
}

.logout-item:hover {
  background: rgba(var(--v-theme-secondary), 0.12);
}

.mobile-navigation-card {
  width: min(320px, calc(100vw - 24px));
  padding: 10px;
  border: 1px solid rgba(var(--v-theme-border), 0.9);
  border-radius: 18px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.16);
}

.mobile-user-identity {
  margin-top: 0;
}

.mobile-navigation-divider {
  margin: 10px 4px;
}
</style>
