<script setup>
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref('')

const processIntegration = async () => {
  try {
    loading.value = true
    error.value = ''

    const chatId = route.params.chatId

    if (!chatId) {
      error.value = 'Chat ID faltante.'
      setTimeout(() => {
        router.push('/login')
      }, 2000)
      return
    }

    // Verificar autenticación del usuario
    if (!authStore.accessToken) {
      // Guardar el chatId en sessionStorage para después del login
      sessionStorage.setItem('pendingIntegrationChatId', chatId)

      // Redirigir a login
      await router.push('/login')
      return
    }

    // Si hay sesión activa, redirigir al chat
    await router.push({
      name: 'chat',
      query: { selected_chat_id: chatId },
    })
  } catch (err) {
    console.error('Integration error:', err)
    error.value = 'Error al procesar la integración. Por favor, intenta nuevamente.'

    setTimeout(() => {
      router.push('/login')
    }, 3000)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  processIntegration()
})
</script>

<template>
  <v-container class="quotation-integration-view" fluid>
    <div class="integration-content">
      <div v-if="loading" class="integration-state">
        <v-progress-circular color="primary" indeterminate size="48" />
        <p>Procesando integración...</p>
        <p class="text-caption text-medium-emphasis">Redirigiendo a tu cotización</p>
      </div>

      <div v-else-if="error" class="integration-state">
        <v-icon color="error" icon="mdi-alert-circle-outline" size="48" />
        <p class="error-message">{{ error }}</p>
        <p class="text-caption text-medium-emphasis">Redirigiendo en breve...</p>
      </div>
    </div>
  </v-container>
</template>

<style scoped>
.quotation-integration-view {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.1) 0%, rgba(var(--v-theme-secondary), 0.1) 100%);
}

.integration-content {
  width: 100%;
}

.integration-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px;
  text-align: center;
}

.integration-state p {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.error-message {
  color: rgb(var(--v-theme-error));
  font-weight: 500 !important;
}
</style>
