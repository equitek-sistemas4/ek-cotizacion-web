<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import logoImg from '@/assets/logo.png'

const router = useRouter()
const collapsed = ref(false)
const logoUrl = logoImg

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

const logout = () => {
  router.push('/login')
}
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
        />
      </v-list>

      <v-spacer />

      <v-list class="logout-list" density="compact" nav>
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
