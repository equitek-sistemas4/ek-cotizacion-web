<script setup>
import { shallowRef, computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getChatsWpp } from '@/services/chats_whatsapp'
import { useAuthStore } from '@/stores/auth'
import WhatsappConversationPanel from '@/components/WhatsappConversationPanel.vue'
import dialogCreateWhatsappChat from '@/components/dialogCreateWhatsappChat.vue'

const emit = defineEmits(['created'])

const router = useRouter()
const authStore = useAuthStore()
const whatsappDialog = shallowRef(false)
const chats = ref([])
const chatSearch = ref('')
const selectedChatId = ref(null)
const chatsLoading = ref(false)
const chatsError = ref('')

const selectedChat = computed(() => chats.value.find((chat) => String(chat.id) === String(selectedChatId.value)) ?? null)
const shouldOmitUserId = computed(() => [1, 17].includes(Number(authStore.user?.idtipo_usuario)))

const handleWhatsappChatCreated = async (createdChat) => {
  await fetchChats()
  const createdChatId = createdChat?.id ?? createdChat?.chat_id ?? createdChat?.data?.id
  if (createdChatId && chats.value.some((chat) => String(chat.id) === String(createdChatId))) {
    selectedChatId.value = createdChatId
  }
  emit('created', createdChat)
}

const formatChatTime = (value) => {
  if (!value) return ''
  const numeric = Number(value)
  const date = Number.isFinite(numeric) && String(value).trim() !== '' ? new Date(numeric < 100000000000 ? numeric * 1000 : numeric) : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

const normalizeChat = (chat) => ({
  id: chat.id,
  channel: 'whatsapp',
  name: chat.name ?? chat.contact?.name ?? chat.contact?.display_name ?? chat.contact_name ?? 'Conversación de WhatsApp',
  description: chat.description ?? chat.contact?.company ?? chat.contact?.phone_number ?? chat.phone_number ?? 'WhatsApp',
  phone_number: chat.phone_number ?? chat.contact?.phone_number ?? null,
  time: formatChatTime(chat.created_at),
})

const hasUserSession = () => Boolean(authStore.accessToken && authStore.userId)

const fetchChats = async () => {
  chatsLoading.value = true
  chatsError.value = ''
  try {
    const params = shouldOmitUserId.value ? {} : { user_id: authStore.userId }
    const query = chatSearch.value.trim().toLocaleLowerCase()
    chats.value = (await getChatsWpp(params))
      .map(normalizeChat)
      .filter((chat) => !query || `${chat.name} ${chat.description}`.toLocaleLowerCase().includes(query))
    if (!chats.value.some((chat) => String(chat.id) === String(selectedChatId.value))) selectedChatId.value = null
  } catch (error) {
    chatsError.value = error.message || 'No se pudieron cargar los chats de WhatsApp.'
  } finally {
    chatsLoading.value = false
  }
}

onMounted(async () => {
  if (!hasUserSession()) {
    authStore.clearSession()
    await router.push('/login')
    return
  }
  await fetchChats()
})
</script>

<template>
  <v-container class="whatsapp-view" fluid>
    <v-card class="whatsapp-shell" elevation="0" rounded="lg">
      <aside class="chat-sidebar">
        <div class="sidebar-header">
          <v-row>
            <v-col cols="8">
              <h1>WhatsApp</h1>
              <p>Conversaciones</p>
            </v-col>
            <v-col>
              <dialog-create-whatsapp-chat
                v-model="whatsappDialog"
                @created="handleWhatsappChatCreated"
              />

              <v-speed-dial
                location="bottom center"
                transition="slide-y-reverse-transition"
              >
                <template #activator="{ props: activatorProps }">
                  <v-btn
                    class="text-none font-weight-regular"
                    icon="mdi-plus"
                    variant="elevated"
                    color="primary"
                    v-bind="activatorProps"
                  ></v-btn>
                </template>

                <!--<v-btn
                  aria-label="Crear chat"
                  color="primary"
                  icon="mdi-chat-plus"
                  @click="dialog = true"
                ></v-btn>-->

                <v-btn
                  aria-label="Crear conversación de WhatsApp"
                  color="success"
                  icon="mdi-whatsapp"
                  @click="whatsappDialog = true"
                ></v-btn>
              </v-speed-dial>
            </v-col>
          </v-row>
        </div>
        <v-text-field v-model="chatSearch" class="chat-search" clearable density="compact" hide-details placeholder="Buscar conversación" prepend-inner-icon="mdi-magnify" variant="outlined" @update:model-value="fetchChats" />
        <div v-if="chatsLoading" class="chat-state">
          <v-progress-circular color="success" indeterminate size="28" />
          <span>Cargando conversaciones...</span>
        </div>
        <div v-else-if="chatsError" class="chat-state chat-state-error">
          <v-icon color="error" icon="mdi-alert-circle-outline" /><span>{{ chatsError }}</span></div>
        <div v-else-if="!chats.length" class="chat-state">
          <v-icon color="success" icon="mdi-whatsapp" />
          <span>No hay conversaciones disponibles.</span>
        </div>
        <v-list v-else class="chat-list" lines="two">
          <v-list-item v-for="chat in chats" :key="chat.id" :active="String(chat.id) === String(selectedChatId)" active-color="success" class="chat-list-item" rounded="lg" @click="selectedChatId = chat.id">
            <template #prepend><v-avatar color="success" size="42"><v-icon icon="mdi-whatsapp" /></v-avatar></template>
            <v-list-item-title>{{ chat.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ chat.description }}</v-list-item-subtitle>
            <template #append><span class="chat-time">{{ chat.time }}</span></template>
          </v-list-item>
        </v-list>
      </aside>

      <section v-if="selectedChat" class="conversation-panel">
        <WhatsappConversationPanel :access-token="authStore.accessToken" :chat="selectedChat" :user-name="authStore.user?.name || authStore.user?.email || 'Usuario'" />
      </section>
      <section v-else class="conversation-panel empty-panel"><v-icon color="success" icon="mdi-whatsapp" size="44" /><span>Selecciona una conversación.</span></section>
    </v-card>
  </v-container>
</template>

<style scoped>
.whatsapp-view {
  width: 100%;
  min-height: 100vh; 
  min-height: 100dvh; 
  padding: 24px; 
  background: rgb(var(--v-theme-appBackground)); 
}
.whatsapp-shell { 
  display: grid; 
  grid-template-columns: minmax(260px, 300px) minmax(0, 1fr); 
  gap: 16px; 
  width: min(100%, 1600px); 
  height: calc(100vh - 48px); 
  margin: 0 auto; 
  background: transparent; 
}
.chat-sidebar, .conversation-panel { 
  min-width: 0; 
  border: 1px solid rgb(var(--v-theme-border)); 
  border-radius: 8px; 
  background: rgb(var(--v-theme-surface)); 
}
.chat-sidebar { 
  position: relative; 
  display: flex; 
  flex-direction: column; 
  padding: 20px; 
  overflow: hidden; 
}
.sidebar-header h1, .sidebar-header p { 
  margin: 0; 
}
.sidebar-header h1 { 
  color: rgb(var(--v-theme-textPrimary)); 
  font-size: 1.6rem; 
}
.sidebar-header p, .chat-time { 
  color: rgb(var(--v-theme-textMuted)); 
  font-size: .82rem; 
}
.chat-search { 
  margin: 16px 0 10px; 
  --v-input-control-height: 34px; 
}
.chat-search :deep(.v-field), .chat-search :deep(.v-field__input) { 
  min-height: 34px; 
  height: 34px; 
}
.chat-search :deep(.v-field__input) { 
  padding-top: 0; 
  padding-bottom: 0; 
}
.chat-list { 
  position: absolute; 
  top: 146px; 
  right: 20px; 
  bottom: 20px; 
  left: 20px; 
  overflow-y: auto; 
  padding: 0; 
}
.chat-list-item { 
  margin-bottom: 8px; 
}
.chat-list-item :deep(.v-list-item__content), .chat-list-item :deep(.v-list-item-title), .chat-list-item :deep(.v-list-item-subtitle) { 
  min-width: 0; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  white-space: nowrap; 
}
.chat-state, .empty-panel { 
  display: grid; 
  flex: 1; 
  place-items: center; 
  gap: 10px; 
  color: rgb(var(--v-theme-textMuted)); 
  text-align: center; 
}
.chat-state-error { 
  color: rgb(var(--v-theme-error)); 
}
.conversation-panel { 
  overflow: hidden; 
}
@media (max-width: 900px) { 
  .whatsapp-view { 
    padding: 0; 
  }
  .whatsapp-shell { 
    display: block; 
    height: 100dvh; 
  }
  .chat-sidebar { 
    height: 36vh; 
    border-radius: 0; 
  }
  .conversation-panel { 
    height: 64vh; 
    border-radius: 0; 
  }
}
</style>
