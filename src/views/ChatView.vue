<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getChats } from '@/services/chats'
import { getUnreadNotifications, readNotifications } from '@/services/notifications'
import { useAuthStore } from '@/stores/auth'
import generateLinkQuotation from '@/components/generateLinkQuotation.vue'
import ChatConversationDrawer from '@/components/ChatConversationDrawer.vue'
import UsersQuotationView from '@/views/UsersQuotationView.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const chats = ref([])
const chatSearch = ref('')
const selectedChatId = ref(null)
const chatsLoading = ref(false)
const chatsError = ref('')
const chatDrawerOpen = ref(false)
const userId = ref(null)
const unreadNotificationsByChat = ref({})
let chatsRequestId = 0

const selectedChat = computed(() => chats.value.find((chat) => String(chat.id) === String(selectedChatId.value)) ?? null)
const shouldOmitUserIdFromChats = computed(() => [1, 17].includes(Number(authStore.user?.idtipo_usuario)))

const decodeTokenPayload = (token) => {
  try {
    const payload = token?.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')))
  } catch {
    return null
  }
}

const hasUserSession = () => {
  const payload = decodeTokenPayload(authStore.accessToken)
  return Boolean(authStore.accessToken && payload?.token_use !== 'chat_contact' && !payload?.sub?.startsWith('chat:'))
}

const formatChatTime = (value) => {
  if (!value) return ''
  const numeric = Number(value)
  const date = Number.isFinite(numeric) && String(value).trim() !== '' ? new Date(numeric < 100000000000 ? numeric * 1000 : numeric) : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

const normalizeChat = (chat) => ({
  id: chat.id,
  name: chat.name ?? 'Sin nombre',
  channel: chat.channel ?? 'chat',
  quotation_id: chat.quotation_id ?? chat.quotationId ?? chat.quotation?.id ?? null,
  description: chat.description ?? chat.chat_description ?? '',
  phone_number: chat.phone_number ?? chat.contact?.phone_number ?? null,
  time: formatChatTime(chat.created_at),
})

const getUnreadNotificationCounts = async () => {
  if (!userId.value) {
    return {}
  }

  try {
    const notifications = await getUnreadNotifications(userId.value)
    return notifications
      .filter((notification) => notification.section === 'chat' && notification.chat_id != null)
      .reduce((counts, notification) => {
        const chatId = String(notification.chat_id)
        counts[chatId] = (counts[chatId] ?? 0) + 1
        return counts
      }, {})
  } catch {
    return {}
  }
}

const fetchChats = async ({ preferredChatId = null, search = chatSearch.value } = {}) => {
  const requestId = ++chatsRequestId
  chatsLoading.value = true
  chatsError.value = ''
  try {
    const chatParams = { search }
    if (!shouldOmitUserIdFromChats.value) {
      chatParams.user_id = userId.value
    }
    const [chatList, notificationCounts] = await Promise.all([getChats(chatParams), getUnreadNotificationCounts()])
    if (requestId !== chatsRequestId) return
    unreadNotificationsByChat.value = notificationCounts
    chats.value = chatList.map(normalizeChat).filter((chat) => chat.channel !== 'whatsapp')
    const targetChatId = preferredChatId ?? selectedChatId.value
    selectedChatId.value = chats.value.some((chat) => String(chat.id) === String(targetChatId)) ? targetChatId : null
  } catch (error) {
    if (requestId === chatsRequestId) chatsError.value = error.message || 'Ocurrió un error al cargar los chats.'
  } finally {
    if (requestId === chatsRequestId) chatsLoading.value = false
  }
}

const selectChat = async (chatId) => {
  selectedChatId.value = chatId
  chatDrawerOpen.value = false

  if (!userId.value) return

  try {
    await readNotifications({
      user_id: userId.value,
      section: 'chat',
      chat_id: chatId,
    })
    delete unreadNotificationsByChat.value[String(chatId)]
  } catch {
    // Se mantiene el badge si las notificaciones no pudieron marcarse como leídas.
  }
}

const handleChatCreated = async (chat) => {
  await fetchChats({ preferredChatId: chat?.id ?? chat?.chat_id ?? chat?.chat?.id })
}

onMounted(async () => {
  if (!hasUserSession()) {
    authStore.clearSession()
    await router.push('/login')
    return
  }
  userId.value = authStore.userId
  const preferredChatId = route.query.selected_chat_id
  await fetchChats({ preferredChatId })
  if (preferredChatId) await router.replace({ name: 'chat' })
})
</script>

<template>
  <v-container class="chat-view" fluid>
    <v-card class="chat-shell" elevation="0" rounded="lg">
      <aside class="chat-sidebar">
        <div class="sidebar-header"><div><p class="section-label"></p><h1>Cotizaciones</h1></div><generate-link-quotation @created="handleChatCreated" /></div>
        <v-text-field 
          v-model="chatSearch" 
          class="chat-search" 
          clearable 
          density="compact" 
          hide-details 
          placeholder="Buscar chat" 
          prepend-inner-icon="mdi-magnify" 
          variant="outlined" 
          @update:model-value="(value) => fetchChats({ search: value ?? '' })" 
        />
        <div v-if="chatsLoading" class="chat-state"><v-progress-circular color="primary" indeterminate size="28" /><span>Cargando chats...</span></div>
        <div v-else-if="chatsError" class="chat-state chat-state-error"><v-icon color="error" icon="mdi-alert-circle-outline" /><span>{{ chatsError }}</span></div>
        <div v-else-if="!chats.length" class="chat-state"><v-icon color="primary" icon="mdi-message-outline" /><span>No hay chats disponibles.</span></div>
        <v-list v-else class="chat-list" lines="two">
          <v-list-item v-for="chat in chats" :key="chat.id" :active="String(chat.id) === String(selectedChatId)" active-color="primary" class="chat-list-item" rounded="lg" @click="selectChat(chat.id)">
            <template #prepend>
              <v-avatar :color="chat.channel === 'whatsapp' ? 'success' : 'secondary'" size="42">
                <v-icon v-if="chat.channel === 'whatsapp'" icon="mdi-whatsapp" />
                <span v-else class="avatar-text">{{ chat.name.charAt(0) }}</span>
              </v-avatar>
            </template>
            <v-list-item-title>
              {{ chat.name }}
              <template v-if="chat.channel !== 'whatsapp'">
                #{{ chat.quotation_id }}
              </template>
            </v-list-item-title>
            <v-list-item-subtitle>{{ chat.description }}</v-list-item-subtitle>
            <template #append>
              <v-badge
                v-if="unreadNotificationsByChat[String(chat.id)]"
                color="error"
                :content="unreadNotificationsByChat[String(chat.id)]"
                inline
              />
              <span class="chat-time">{{ chat.time }}</span>
            </template>
          </v-list-item>
        </v-list>
      </aside>
      <section v-if="selectedChat" class="quotation-panel"><UsersQuotationView :chat-id="selectedChat.id" embedded /></section>
      <section v-else class="quotation-panel empty-panel"><v-icon color="primary" icon="mdi-file-document-outline" size="44" /><span>Selecciona una cotización.</span></section>
    </v-card>
    <ChatConversationDrawer v-model="chatDrawerOpen" :access-token="authStore.accessToken" :chat="selectedChat" :user-id="userId" :user-name="authStore.user?.name || authStore.user?.email || 'Usuario'" @chat-deleted="fetchChats" />
  </v-container>
</template>

<style scoped>
.chat-view { 
  width: 100%; min-height: 100vh; min-height: 100dvh; padding: 24px; background: rgb(var(--v-theme-appBackground)); 
}
.chat-shell { 
  display: grid; 
  grid-template-columns: minmax(320px, 400px) minmax(0, 1fr);
  gap: 16px; 
  
  height: calc(100vh - 48px); 
  margin: 0 auto; 
  background: transparent; 
}
.chat-sidebar, .quotation-panel { min-width: 0; border: 1px solid rgb(var(--v-theme-border)); border-radius: 8px; background: rgb(var(--v-theme-surface)); }
.chat-sidebar { position: relative; display: flex; flex-direction: column; padding: 20px; overflow: hidden; }
.sidebar-header { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  gap: 12px; 
}.section-label { 
  margin: 0 0 2px; 
  color: rgb(var(--v-theme-textMuted)); 
  font-size: .86rem; 
}h1 { 
  margin: 0; 
  color: rgb(var(--v-theme-textPrimary)); 
  font-size: 1.6rem; 
}.chat-search { 
  margin: 16px 0 10px; 
  --v-input-control-height: 34px; 
}.chat-search :deep(.v-field) { 
  height: 34px; 
  min-height: 34px; 
}.chat-search :deep(.v-field__input) { 
  min-height: 34px; 
  padding-top: 0; 
  padding-bottom: 0; 
}.chat-list { 
  position: absolute; 
  top: 154px; 
  right: 20px; 
  bottom: 20px; 
  left: 20px; 
  overflow-y: auto; 
  padding: 0; 
}.chat-list-item { 
  margin-bottom: 8px; 
}.chat-list-item :deep(.v-list-item__content), .chat-list-item :deep(.v-list-item-title), .chat-list-item :deep(.v-list-item-subtitle) { 
  min-width: 0; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  white-space: nowrap; 
}.avatar-text { 
  color: rgb(var(--v-theme-surface)); 
  font-weight: 700; 
}.chat-time { 
  color: rgb(var(--v-theme-textMuted)); 
  font-size: .76rem; 
}.chat-state, .empty-panel { 
  display: grid; 
  flex: 1; 
  place-items: center; 
  gap: 10px; 
  color: rgb(var(--v-theme-textMuted)); 
  text-align: center; 
}.chat-state-error { 
  color: rgb(var(--v-theme-error)); 
}.quotation-panel { 
  overflow-y: auto; 
}.quotation-panel :deep(.client-quotation-page) { 
  min-height: 100%; margin: 0; 
}
@media (max-width: 900px) { .chat-view { padding: 0; }.chat-shell { display: block; height: 100dvh; }.chat-sidebar { height: 36vh; border-radius: 0; }.quotation-panel { height: 64vh; border-radius: 0; } }
</style>
