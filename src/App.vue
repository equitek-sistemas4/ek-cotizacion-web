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

<style scoped></style>
