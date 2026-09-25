<script setup>
import { RouterView } from 'vue-router'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppSidebar from './components/AppSidebar.vue'
import { useAuthStore } from './stores/auth'
import { unauthorizedEventName } from './services/http'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const invalidTokenDialog = ref(false)
const showSidebar = computed(() => !route.meta.hideSidebar)

const showInvalidTokenDialog = () => {
  invalidTokenDialog.value = true
}

const acceptInvalidToken = async () => {
  invalidTokenDialog.value = false
  authStore.clearSession()

  if (route.name !== 'contact-chat') {
    await router.push('/login')
  }
}

onMounted(() => {
  window.addEventListener(unauthorizedEventName, showInvalidTokenDialog)
})

onBeforeUnmount(() => {
  window.removeEventListener(unauthorizedEventName, showInvalidTokenDialog)
})
</script>

<template>
  <v-app>
    <AppSidebar v-if="showSidebar" />

    <v-main>
      <RouterView />
    </v-main>

    <v-dialog v-model="invalidTokenDialog" max-width="420" persistent>
      <v-card rounded="lg">
        <v-card-title>Token invalido</v-card-title>
        <v-card-text>Tu sesion no es valida o ha expirado. Inicia sesion nuevamente.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="acceptInvalidToken">Aceptar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<style scoped>
:deep(.v-card) {
  border: 1px solid rgba(var(--v-theme-border), 0.9) !important;
  border-radius: 18px !important;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08) !important;
  background: rgba(var(--v-theme-surface), 0.98) !important;
}

:deep(.v-card-title) {
  color: rgb(var(--v-theme-textPrimary));
  font-weight: 700;
  letter-spacing: -0.02em;
}

:deep(.v-card-text) {
  color: rgb(var(--v-theme-textMuted));
}

:deep(.v-dialog .v-card) {
  box-shadow: 0 20px 44px rgba(15, 23, 42, 0.14) !important;
}

:deep(.v-btn) {
  border-radius: 14px !important;
  letter-spacing: 0.01em;
  font-weight: 600;
  text-transform: none !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

:deep(.v-btn:hover) {
  transform: translateY(-1px);
}

:deep(.v-btn--variant-flat),
:deep(.v-btn--variant-elevated) {
  background: rgb(var(--v-theme-primary)) !important;
  color: rgb(var(--v-theme-surface)) !important;
}

:deep(.v-btn--variant-flat:hover),
:deep(.v-btn--variant-elevated:hover) {
  background: rgba(var(--v-theme-primary), 0.92) !important;
}

:deep(.v-btn--variant-tonal) {
  background: rgba(var(--v-theme-primary), 0.08) !important;
  color: rgb(var(--v-theme-primary)) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
}

:deep(.v-btn--variant-outlined) {
  background: rgba(var(--v-theme-surface), 0.96) !important;
  color: rgb(var(--v-theme-textPrimary)) !important;
  border: 1px solid rgba(var(--v-theme-border), 0.9) !important;
}

:deep(.v-btn--variant-text) {
  background: transparent !important;
  color: rgb(var(--v-theme-textPrimary)) !important;
  box-shadow: none !important;
}

:deep(.v-btn--variant-text:hover) {
  background: rgba(var(--v-theme-primary), 0.04) !important;
}

:deep(.v-btn--icon) {
  min-width: 38px !important;
  width: 38px !important;
  height: 38px !important;
  border-radius: 12px !important;
  box-shadow: none !important;
}

:deep(.v-speed-dial .v-btn) {
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}
</style>
