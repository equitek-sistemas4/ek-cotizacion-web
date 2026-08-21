<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getChatById, getChatMessages, getChats, searchChatsMessages, sendChatMessage } from '@/services/chats'
import { getChatsWpp } from '@/services/chats_whatsapp'
import { getChatMessagesWpp, sendWhatsappMessage } from '@/services/whatsapp'
import { useAuthStore } from '@/stores/auth'
import dialogAddMember from '@/components/dialogAddMember.vue'
import generateLinkQuotation from '@/components/generateLinkQuotation.vue'
import infoChatMembers from '@/components/infoChatMembers.vue'

const router = useRouter()
const authStore = useAuthStore()
const message = ref('')
const chatSearch = ref('')
const messageSearch = ref('')
const messageSearchVisible = ref(false)
const messageSearchLoading = ref(false)
const matchingMessageIds = ref(new Set())
const selectedMatchIndex = ref(-1)
const selectedFile = ref(null)
const fileInput = ref(null)
const userId = ref(null)
const selectedChatId = ref(null)
const mobileConversationOpen = ref(false)
const chatsLoading = ref(false)
const chatsError = ref('')
const chatDetailLoading = ref(false)
const chatDetailError = ref('')
const messagesLoading = ref(false)
const messagesError = ref('')
const messageSending = ref(false)
const sendMessageError = ref('')
const messagesPanel = ref(null)
const chatSocket = ref(null)
const infoChatMembersKey = ref(0)

const chats = ref([])
let selectedChatRequestId = 0
let chatsRequestId = 0
let messageSearchRequestId = 0

const selectedChat = computed(() => chats.value.find((chat) => chat.id === selectedChatId.value))
const loggedUserName = computed(() => authStore.user?.name || authStore.user?.email || 'Usuario')
const matchingMessages = computed(() =>
  (selectedChat.value?.messages ?? []).filter((messageItem) => isMatchingMessage(messageItem.id)),
)
const activeMatchingMessageId = computed(() => matchingMessages.value[selectedMatchIndex.value]?.id ?? null)

const getSearchResultMessageIds = (searchResults) => {
  const messages = Array.isArray(searchResults)
    ? searchResults
    : searchResults?.messages ?? []

  return new Set(
    messages
      .map((messageItem) => messageItem?.id ?? messageItem?.message?.id)
      .filter(Boolean)
      .map(String),
  )
}

const isMatchingMessage = (messageId) => matchingMessageIds.value.has(String(messageId))

const getMessageSenderName = (messageItem) => {
  if (selectedChat.value?.channel !== 'whatsapp') {
    return messageItem.senderName
  }

  return messageItem.fromMe
    ? loggedUserName.value
    : selectedChat.value.name || messageItem.senderName || 'Contacto'
}

const messageElementRefs = new Map()

const setMessageElement = (messageId, element) => {
  if (element) {
    messageElementRefs.set(String(messageId), element)
    return
  }

  messageElementRefs.delete(String(messageId))
}

const scrollToSelectedMatch = async () => {
  const messageId = activeMatchingMessageId.value

  if (!messageId) {
    return
  }

  await nextTick()
  messageElementRefs.get(String(messageId))?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

const getHighlightedMessageParts = (text) => {
  const messageText = text ?? ''
  const query = messageSearch.value.trim()

  if (!query) {
    return [{ text: messageText, isMatch: false }]
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const expression = new RegExp(`(${escapedQuery})`, 'gi')

  return messageText
    .split(expression)
    .filter((part) => part !== '')
    .map((part) => ({
      text: part,
      isMatch: part.toLocaleLowerCase() === query.toLocaleLowerCase(),
    }))
}

const decodeTokenPayload = (token) => {
  try {
    const payload = token?.split('.')[1]

    if (!payload) {
      return null
    }

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = atob(normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '='))

    return JSON.parse(decodedPayload)
  } catch {
    return null
  }
}

const isContactToken = (token) => {
  const payload = decodeTokenPayload(token)

  return payload?.token_use === 'chat_contact' || payload?.sub?.startsWith('chat:')
}

const getUserAccessToken = () => {
  if (!authStore.accessToken || isContactToken(authStore.accessToken)) {
    return null
  }

  return authStore.accessToken
}

const ensureUserSession = async () => {
  if (getUserAccessToken()) {
    return true
  }

  closeChatWebSocket()
  authStore.clearSession()
  await router.push('/login')

  return false
}

// eslint-disable-next-line no-unused-vars
const selectedChatMemberNames = computed(() => {
  const members = selectedChat.value?.members ?? []
  const names = members
    .map((member) => member.contact?.name || member.contact_name || member.contact?.display_name)
    .filter(Boolean)

  return names.length ? names.join(', ') : 'Sin miembros'
})

const scrollMessagesToBottom = async () => {
  await nextTick()
  await new Promise((resolve) => requestAnimationFrame(resolve))

  if (messagesPanel.value) {
    messagesPanel.value.scrollTop = messagesPanel.value.scrollHeight
  }
}

const formatChatTime = (dateValue) => {
  if (!dateValue) {
    return ''
  }

  // La API de Meta entrega `timestamp` como segundos Unix, mientras que el
  // resto de los mensajes del sistema usa fechas ISO.
  const numericDateValue = Number(dateValue)
  const date = Number.isFinite(numericDateValue) && String(dateValue).trim() !== ''
    ? new Date(numericDateValue < 100000000000 ? numericDateValue * 1000 : numericDateValue)
    : new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const truncateText = (text, maxLength = 17) => {
  if (!text) {
    return ''
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

const normalizeChat = (chat) => ({
  id: chat.id,
  name: chat.name ?? 'Sin nombre',
  channel: chat.channel ?? 'chat',
  status: chat.status,
  quotation_id: chat.quotation_id ?? chat.quotationId ?? chat.quotation?.id ?? null,
  createdAt: chat.created_at,
  description: chat.description ?? chat.chat_description ?? '',
  phone_number: chat.phone_number ?? chat.contact?.phone_number ?? null,
  time: formatChatTime(chat.created_at),
  unread: 0,
  messages: [],
  members: [],
})

const normalizeWhatsappChat = (chat) =>
  normalizeChat({
    ...chat,
    channel: 'whatsapp',
    name:
      chat.name ??
      chat.contact?.name ??
      chat.contact?.display_name ??
      chat.contact_name ??
      'Conversación de WhatsApp',
    description:
      chat.description ??
      chat.contact?.company ??
      chat.contact?.phone_number ??
      chat.phone_number ??
      'WhatsApp',
  })

const getChatId = (chat) => chat?.id ?? chat?.chat_id ?? chat?.chat?.id ?? chat?.chat?.chat_id

const getAttachmentUrl = (file) => {
  const fileUrl = file?.url ?? file?.file_url ?? file?.download_url ?? file?.path ?? file?.location

  if (!fileUrl) {
    return ''
  }

  try {
    return new URL(fileUrl, import.meta.env.VITE_API_BASE_URL).toString()
  } catch {
    return fileUrl
  }
}

const normalizeFiles = (files) => {
  if (!files) {
    return []
  }

  const fileList = Array.isArray(files)
    ? files
    : files.url || files.file_url || files.download_url || files.path || files.location
      ? [files]
      : Object.values(files)

  return fileList
    .filter((file) => file && typeof file === 'object')
    .map((file) => {
      const url = getAttachmentUrl(file)
      const name = file.name ?? file.filename ?? file.file_name ?? 'Archivo adjunto'
      const type = file.type ?? file.mime_type ?? file.content_type ?? ''

      return {
        name,
        type,
        url,
        isImage: type.startsWith('image/') || /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(url),
      }
    })
}

const normalizeMessage = (messageItem) => {
  const messageData = messageItem.message ?? messageItem ?? {}
  const sender = messageItem.sender ?? {}
  const text = messageData.text?.body ?? messageData.text ?? messageData.body ?? messageData.message ?? ''
  const direction = String(messageData.direction ?? '').toLocaleLowerCase()

  return {
    id: messageData.id ?? messageData.message_id,
    text: typeof text === 'string' ? text : '',
    time: formatChatTime(messageData.created_at ?? messageData.timestamp),
    fromMe:
      direction === 'outgoing'
        ? true
        : direction === 'incoming'
          ? false
          : messageData.sender_type === 'user' || sender.type === 'user' || messageData.from_me === true,
    senderName: sender.display_name ?? messageData.sender_name ?? 'Sin nombre',
    sender,
    files: normalizeFiles(messageData.files),
  }
}

const getChatWebSocketUrl = (chat) => {
  const baseUrl = new URL(import.meta.env.VITE_API_BASE_URL)
  const accessToken = getUserAccessToken()

  baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  baseUrl.pathname = chat.channel === 'whatsapp' ? '/chats/whatsapp/ws' : `/chats/${chat.id}/ws`
  baseUrl.search = ''

  if (chat.channel === 'whatsapp' && chat.phone_number) {
    baseUrl.searchParams.set('phone_number', chat.phone_number)
  }

  if (accessToken) {
    baseUrl.searchParams.set('token', accessToken)
  }

  return baseUrl.toString()
}

const getIncomingMessagePayloads = (eventData) => {
  const payload = eventData?.data ?? eventData
  const messagePayloads = Array.isArray(payload) ? payload : [payload]

  return messagePayloads.flatMap((messagePayload) => {
    if (Array.isArray(messagePayload?.messages)) {
      return messagePayload.messages.map((message) => ({ message, sender: messagePayload.sender ?? {} }))
    }

    // Formato original de los eventos de WhatsApp Cloud API.
    const webhookMessages = messagePayload?.entry?.flatMap((entry) =>
      entry.changes?.flatMap((change) =>
        (change.value?.messages ?? []).map((message) => ({
          message,
          sender: change.value?.contacts?.[0] ?? {},
        })),
      ) ?? [],
    ) ?? []

    if (webhookMessages.length) {
      return webhookMessages
    }

    if (messagePayload?.message) {
      return [{
        ...messagePayload,
        sender: messagePayload.sender ?? {},
      }]
    }

    if (messagePayload?.id && (messagePayload?.text || messagePayload?.body)) {
      return [{
        message: messagePayload,
        sender: messagePayload.sender ?? {},
      }]
    }

    return []
  })
}

const appendIncomingMessage = async (chatId, messageItem) => {
  const chat = chats.value.find((item) => String(item.id) === String(chatId))

  if (!chat || !messageItem) {
    return
  }

  const newMessage = normalizeMessage(messageItem)
  const alreadyExists = chat.messages.some(
    (item) => newMessage.id && String(item.id) === String(newMessage.id),
  )

  if (alreadyExists) {
    return
  }

  chat.messages.push(newMessage)
  //chat.preview = newMessage.text
  chat.time = newMessage.time

  if (String(selectedChatId.value) === String(chatId)) {
    await scrollMessagesToBottom()
  } else {
    chat.unread += 1
  }
}

const closeChatWebSocket = () => {
  if (chatSocket.value) {
    chatSocket.value.close()
    chatSocket.value = null
  }
}

const connectChatWebSocket = (chatId) => {
  closeChatWebSocket()

  if (!chatId || !getUserAccessToken()) {
    return
  }

  const chat = chats.value.find((item) => String(item.id) === String(chatId))

  if (!chat || (chat.channel === 'whatsapp' && !chat.phone_number)) {
    return
  }

  const socket = new WebSocket(getChatWebSocketUrl(chat))
  chatSocket.value = socket

  socket.onmessage = (event) => {
    try {
      const eventData = JSON.parse(event.data)
      getIncomingMessagePayloads(eventData).forEach((messageItem) => appendIncomingMessage(chatId, messageItem))
    } catch {
      getIncomingMessagePayloads(event.data).forEach((messageItem) => appendIncomingMessage(chatId, messageItem))
    }
  }

  socket.onclose = () => {
    if (chatSocket.value === socket) {
      chatSocket.value = null
    }
  }
}

const updateChatDetail = (chatId, chatDetail) => {
  const chatIndex = chats.value.findIndex((item) => item.id === chatId)

  if (chatIndex === -1 || !chatDetail) {
    return
  }

  chats.value[chatIndex] = {
    ...chats.value[chatIndex],
    name: chatDetail.name ?? chats.value[chatIndex].name,
    quotation_id:
      chatDetail.quotation_id ?? chatDetail.quotationId ?? chatDetail.quotation?.id ?? chats.value[chatIndex].quotation_id,
    description:
      chatDetail.description ?? chatDetail.chat_description ?? chats.value[chatIndex].description,
    createdAt: chatDetail.created_at ?? chats.value[chatIndex].createdAt,
    members: Array.isArray(chatDetail.members) ? chatDetail.members : [],
  }
}

const loadChatDetail = async (chatId) => {
  chatDetailError.value = ''
  chatDetailLoading.value = true

  try {
    const chatDetail = await getChatById(chatId)
    updateChatDetail(chatId, chatDetail)
  } catch (error) {
    chatDetailError.value = error.message || 'Ocurrio un error al cargar el detalle del chat.'
  } finally {
    chatDetailLoading.value = false
  }
}

const updateChatMessages = (chatId, messagesData) => {
  const chatIndex = chats.value.findIndex((item) => item.id === chatId)

  if (chatIndex === -1 || !messagesData) {
    return
  }

  const messageList = Array.isArray(messagesData)
    ? messagesData
    : Array.isArray(messagesData.messages)
      ? messagesData.messages
      : []
  const messages = messageList.map(normalizeMessage)
  const lastMessage = messages.at(-1)

  chats.value[chatIndex] = {
    ...chats.value[chatIndex],
    name: messagesData.chat_name ?? chats.value[chatIndex].name,
    quotation_id:
      messagesData.quotation_id ?? messagesData.quotationId ?? chats.value[chatIndex].quotation_id,
    messages,
    description:
      messagesData.description ?? messagesData.chat_description ?? chats.value[chatIndex].description,
    time: lastMessage?.time ?? chats.value[chatIndex].time,
  }
}

const loadChatMessages = async (chatId) => {
  messagesError.value = ''
  messagesLoading.value = true
  let shouldScrollToBottom = false

  try {
    const chat = chats.value.find((item) => String(item.id) === String(chatId))
    const messagesData =
      chat?.channel === 'whatsapp'
        ? await getChatMessagesWpp({
            accessToken: getUserAccessToken(),
            phone_number: chat.phone_number,
          })
        : await getChatMessages(chatId)
    updateChatMessages(chatId, messagesData)
    shouldScrollToBottom = true
  } catch (error) {
    messagesError.value = error.message || 'Ocurrio un error al cargar los mensajes.'
  } finally {
    messagesLoading.value = false

    if (shouldScrollToBottom) {
      await scrollMessagesToBottom()
    }
  }
}

const loadSelectedChatData = async (chatId) => {
  const chat = chats.value.find((item) => String(item.id) === String(chatId))

  if (chat?.channel === 'whatsapp') {
    await loadChatMessages(chatId)
    return
  }

  await Promise.all([loadChatDetail(chatId), loadChatMessages(chatId)])
}

const refreshSelectedChat = async ({ chat_id } = {}) => {
  const chatId = chat_id ?? selectedChatId.value

  if (!chatId) {
    return
  }

  await loadSelectedChatData(chatId)
  infoChatMembersKey.value += 1
}

const activateChat = async (chatId, { openMobile = true } = {}) => {
  const requestId = ++selectedChatRequestId

  selectedChatId.value = chatId
  messageSearch.value = ''
  messageSearchVisible.value = false
  matchingMessageIds.value = new Set()
  selectedMatchIndex.value = -1
  messageSearchRequestId += 1
  mobileConversationOpen.value = openMobile
  chatDetailError.value = ''
  closeChatWebSocket()

  const chat = chats.value.find((item) => item.id === chatId)

  if (chat) {
    chat.unread = 0
  }

  await loadSelectedChatData(chatId)

  if (requestId === selectedChatRequestId && String(selectedChatId.value) === String(chatId)) {
    connectChatWebSocket(chatId)
  }
}

const fetchChats = async ({ preferredChatId = null, search = chatSearch.value } = {}) => {
  const requestId = ++chatsRequestId
  chatsLoading.value = true
  chatsError.value = ''

  try {
    const [chatsList, whatsappChatsList] = await Promise.all([getChats({ search }), getChatsWpp()])
    const normalizedWhatsappChats = whatsappChatsList
      .map(normalizeWhatsappChat)
      .filter((chat) => {
        const query = search.trim().toLocaleLowerCase()

        return !query || `${chat.name} ${chat.description}`.toLocaleLowerCase().includes(query)
      })
    const chatList = [...chatsList.map(normalizeChat), ...normalizedWhatsappChats]

    if (requestId !== chatsRequestId) {
      return
    }

    const preferredChat = preferredChatId
      ? chatList.find((chat) => String(chat.id) === String(preferredChatId))
      : null
    const currentChat = chatList.find((chat) => String(chat.id) === String(selectedChatId.value))
    const activeChatId = preferredChat?.id ?? currentChat?.id ?? null

    chats.value = chatList

    if (activeChatId) {
      await activateChat(activeChatId, { openMobile: mobileConversationOpen.value })
    } else {
      selectedChatId.value = null
      closeChatWebSocket()
    }
  } catch (error) {
    if (requestId !== chatsRequestId) {
      return
    }

    chatsError.value = error.message || 'Ocurrio un error al cargar los chats.'
  } finally {
    if (requestId === chatsRequestId) {
      chatsLoading.value = false
    }
  }
}

const handleChatCreated = async (createdChat) => {
  await fetchChats({ preferredChatId: getChatId(createdChat) })
}

const handleChatDeleted = async () => {
  await fetchChats()
}

const handleChatSearch = (search) => {
  const query = search ?? ''
  chatSearch.value = query
  fetchChats({ search: query })
}

const searchMessages = async (search) => {
  const query = typeof search === 'string' ? search.trim() : ''
  const requestId = ++messageSearchRequestId

  if (!query || !selectedChatId.value) {
    matchingMessageIds.value = new Set()
    selectedMatchIndex.value = -1
    messageSearchLoading.value = false
    return
  }

  messageSearchLoading.value = true

  try {
    const searchResults = await searchChatsMessages(selectedChatId.value, { search: query })

    if (requestId === messageSearchRequestId) {
      matchingMessageIds.value = getSearchResultMessageIds(searchResults)
      await nextTick()
      selectedMatchIndex.value = matchingMessages.value.length ? 0 : -1
      await scrollToSelectedMatch()
    }
  } catch (error) {
    if (requestId === messageSearchRequestId) {
      matchingMessageIds.value = new Set()
      selectedMatchIndex.value = -1
      console.error('Error al buscar mensajes del chat:', error)
    }
  } finally {
    if (requestId === messageSearchRequestId) {
      messageSearchLoading.value = false
    }
  }
}

const moveToMatch = async (direction) => {
  const totalMatches = matchingMessages.value.length

  if (!totalMatches) {
    return
  }

  selectedMatchIndex.value = (selectedMatchIndex.value + direction + totalMatches) % totalMatches
  await scrollToSelectedMatch()
}

const toggleMessageSearch = () => {
  messageSearchVisible.value = !messageSearchVisible.value

  if (!messageSearchVisible.value) {
    messageSearch.value = ''
    selectedMatchIndex.value = -1
    searchMessages('')
  }
}

const selectChat = async (chatId) => {
  await activateChat(chatId)
}

const showChatList = () => {
  mobileConversationOpen.value = false
}

const isAllowedAttachment = (file) =>
  file?.type === 'application/pdf' || file?.type?.startsWith('image/')

const selectAttachment = (event) => {
  const [file] = event.target.files ?? []

  if (!file) {
    return
  }

  if (!isAllowedAttachment(file)) {
    sendMessageError.value = 'Solo puedes adjuntar archivos PDF o imágenes.'
    event.target.value = ''
    return
  }

  selectedFile.value = file
  sendMessageError.value = ''
}

const clearAttachment = () => {
  selectedFile.value = null

  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const sendMessage = async () => {
  const text = message.value.trim()

  if ((!text && !selectedFile.value) || !selectedChat.value || messageSending.value) {
    return
  }

  if (!userId.value) {
    sendMessageError.value = 'No se encontro el usuario logeado.'
    return
  }

  messageSending.value = true
  sendMessageError.value = ''

  try {
    if (selectedChat.value.channel === 'whatsapp') {
      if (selectedFile.value) {
        throw new Error('El envío de archivos por WhatsApp aún no está disponible.')
      }

      if (!selectedChat.value.phone_number) {
        throw new Error('El chat de WhatsApp no tiene un número de teléfono asociado.')
      }

      await sendWhatsappMessage({
        to: selectedChat.value.phone_number,
        text,
      })
      await loadChatMessages(selectedChat.value.id)
    } else {
      await sendChatMessage({
        chat_id: selectedChat.value.id,
        sender_id: userId.value,
        sender_type: 'user',
        text,
        file: selectedFile.value,
      })
    }

    message.value = ''
    clearAttachment()
  } catch (error) {
    sendMessageError.value = error.message || 'No se pudo enviar el mensaje.'
  } finally {
    messageSending.value = false
  }
}

onMounted(async () => {
  if (!(await ensureUserSession())) {
    return
  }

  userId.value = authStore.userId
  fetchChats()
})

onBeforeUnmount(closeChatWebSocket)
</script>

<template>
  <v-container class="chat-view" fluid>
    <v-card
      class="chat-shell"
      :class="{ 'is-conversation-open': mobileConversationOpen }"
      elevation="0"
      rounded="lg"
    >
      <aside class="chat-sidebar">
        <div class="sidebar-header">
          <div>
            <p class="section-label">Mensajes</p>
            <h1>Chats</h1>
          </div>

          <generate-link-quotation @created="handleChatCreated" />
        </div>

        <v-text-field
          v-model="chatSearch"
          autocomplete="off"
          class="chat-search"
          color="primary"
          density="compact"
          hide-details
          placeholder="Buscar chat"
          prepend-inner-icon="mdi-magnify"
          single-line
          variant="outlined"
          @update:model-value="handleChatSearch"
        />

        <div v-if="chatsLoading" class="chat-state">
          <v-progress-circular color="primary" indeterminate size="28" />
          <span>Cargando chats...</span>
        </div>

        <div v-else-if="chatsError" class="chat-state chat-state-error">
          <v-icon color="error" icon="mdi-alert-circle-outline" />
          <span>{{ chatsError }}</span>
        </div>

        <div v-else-if="!chats.length" class="chat-state">
          <v-icon color="primary" icon="mdi-message-outline" />
          <span>No hay chats disponibles.</span>
        </div>

        <v-list v-else class="chat-list" lines="two">
          <v-list-item
            v-for="chat in chats"
            :key="chat.id"
            :active="chat.id === selectedChatId"
            active-color="primary"
            class="chat-list-item"
            rounded="lg"
            @click="selectChat(chat.id)"
          >
            <template #prepend>
              <v-avatar :color="chat.channel === 'whatsapp' ? 'success' : 'secondary'" size="42">
                <v-icon v-if="chat.channel === 'whatsapp'" icon="mdi-whatsapp" />
                <span v-else class="avatar-text">{{ chat.name.charAt(0) }}</span>
              </v-avatar>
            </template>

            <v-list-item-title>
              {{ chat.name }}
              <template v-if="chat.channel !== 'whatsapp'">#{{ chat.quotation_id }}</template>
              <v-icon
                v-else
                class="ml-1"
                color="success"
                icon="mdi-whatsapp"
                size="small"
              />
            </v-list-item-title>
            <v-list-item-subtitle>{{ truncateText(chat.description) }}</v-list-item-subtitle>

            <template #append>
              <div class="chat-meta">
                <span>{{ chat.time }}</span>
                <v-badge v-if="chat.unread" color="primary" :content="chat.unread" inline />
              </div>
            </template>
          </v-list-item>
        </v-list>
      </aside>

      <section v-if="selectedChat" class="chat-content">
        <header class="conversation-header">
          <div class="conversation-user">
            <v-btn
              class="mobile-back-button"
              color="primary"
              icon="mdi-arrow-left"
              size="small"
              variant="text"
              @click="showChatList"
            />

            <v-avatar :color="selectedChat.channel === 'whatsapp' ? 'success' : 'primary'" size="44">
              <v-icon v-if="selectedChat.channel === 'whatsapp'" icon="mdi-whatsapp" />
              <span v-else class="avatar-text">{{ selectedChat.name.charAt(0) }}</span>
            </v-avatar>

            <div>
              <h2>
                {{ selectedChat.name }}
                <template v-if="selectedChat.channel !== 'whatsapp'">#{{ selectedChat.quotation_id }}</template>
              </h2>
              <p>{{ selectedChat.description }}</p>
              <p v-if="chatDetailLoading">Cargando miembros...</p>
              <p v-else-if="chatDetailError" class="conversation-error">{{ chatDetailError }}</p>
              <!-- <p v-else>{{ selectedChatMemberNames }}</p> -->
            </div>
          </div>

          <div v-if="selectedChat.channel !== 'whatsapp'" class="conversation-actions">
            <v-text-field
              v-if="messageSearchVisible"
              v-model="messageSearch"
              class="message-search"
              clearable
              density="compact"
              hide-details
              :loading="messageSearchLoading"
              placeholder="Buscar mensaje"
              prepend-inner-icon="mdi-magnify"
              single-line
              variant="outlined"
              @update:model-value="searchMessages"
            />
            <span v-if="messageSearchVisible" class="message-search-count">
              {{ matchingMessages.length ? `${selectedMatchIndex + 1}/${matchingMessages.length}` : '0/0' }}
            </span>
            <v-btn
              v-if="messageSearchVisible"
              aria-label="Coincidencia anterior"
              color="primary"
              icon="mdi-chevron-up"
              :disabled="!matchingMessages.length"
              size="small"
              title="Coincidencia anterior"
              variant="text"
              @click="moveToMatch(-1)"
            />
            <v-btn
              v-if="messageSearchVisible"
              aria-label="Siguiente coincidencia"
              color="primary"
              icon="mdi-chevron-down"
              :disabled="!matchingMessages.length"
              size="small"
              title="Siguiente coincidencia"
              variant="text"
              @click="moveToMatch(1)"
            />
            <v-btn
              :aria-label="messageSearchVisible ? 'Cerrar búsqueda de mensajes' : 'Buscar mensajes'"
              color="primary"
              :icon="messageSearchVisible ? 'mdi-close' : 'mdi-magnify'"
              size="small"
              title="Buscar mensajes"
              variant="text"
              @click="toggleMessageSearch"
            />
            <!--<v-btn color="primary" icon="mdi-phone-outline" size="small" variant="text" />-->
            <!--<v-btn color="primary" icon="mdi-account-multiple-plus" size="small" variant="text" />-->
            <dialogAddMember
              :chat-id="selectedChatId"
              :quotation-id="selectedChat.quotation_id"
              @member-added="refreshSelectedChat"
            />
            <infoChatMembers
              :key="infoChatMembersKey"
              :chat-id="selectedChatId"
              @chat-deleted="handleChatDeleted"
            />
          </div>
        </header>

        <div ref="messagesPanel" class="messages-panel">
          <div v-if="messagesLoading" class="empty-messages">
            <v-progress-circular color="primary" indeterminate size="30" />
            <span>Cargando mensajes...</span>
          </div>

          <div v-else-if="messagesError" class="empty-messages messages-error">
            <v-icon color="error" icon="mdi-alert-circle-outline" size="34" />
            <span>{{ messagesError }}</span>
          </div>

          <div v-else-if="!selectedChat.messages.length" class="empty-messages">
            <v-icon color="primary" icon="mdi-message-text-outline" size="34" />
            <span>No hay mensajes en esta conversacion.</span>
          </div>

          <template v-else>
            <div
              v-for="item in selectedChat.messages"
              :key="item.id"
              :ref="(element) => setMessageElement(item.id, element)"
              class="message-row"
              :class="{
                'message-row-sent': item.fromMe,
                'message-row-search-match': isMatchingMessage(item.id),
                'message-row-search-active': String(item.id) === String(activeMatchingMessageId),
              }"
            >
              <div class="message-bubble">
                <small>{{ getMessageSenderName(item) }}</small>
                <p>
                  <template v-for="(part, index) in getHighlightedMessageParts(item.text)" :key="index">
                    <mark v-if="isMatchingMessage(item.id) && part.isMatch">{{ part.text }}</mark>
                    <template v-else>{{ part.text }}</template>
                  </template>
                </p>
                <div v-if="item.files.length" class="message-attachments">
                  <div v-for="file in item.files" :key="`${file.name}-${file.url}`" class="message-attachment">
                    <img
                      v-if="file.isImage && file.url"
                      :alt="file.name"
                      class="attachment-image-preview"
                      :src="file.url"
                    />
                    <v-icon v-else color="error" icon="mdi-file-pdf-box" size="42" />

                    <div class="attachment-details">
                      <!--<span>{{ file.name }}</span>-->
                      <v-btn
                        aria-label="Descargar archivo"
                        color="gray"
                        :disabled="!file.url"
                        :download="file.name"
                        :href="file.url || undefined"
                        icon="mdi-download"
                        rel="noopener noreferrer"
                        size="small"
                        target="_blank"
                        variant="text"
                      >
                      </v-btn>
                    </div>
                  </div>
                </div>
                <span>{{ item.time }}</span>
              </div>
            </div>
          </template>
        </div>

        <v-form class="message-composer" @submit.prevent="sendMessage">
          <span v-if="sendMessageError" class="send-message-error">{{ sendMessageError }}</span>

          <div v-if="selectedFile" class="attachment-preview">
            <v-icon :icon="selectedFile.type === 'application/pdf' ? 'mdi-file-pdf-box' : 'mdi-file-image-outline'" />
            <span>{{ selectedFile.name }}</span>
            <v-btn
              aria-label="Quitar archivo adjunto"
              density="compact"
              icon="mdi-close"
              size="small"
              variant="text"
              @click="clearAttachment"
            />
          </div>

          <input
            ref="fileInput"
            accept="application/pdf,image/*"
            class="attachment-input"
            :disabled="messageSending"
            type="file"
            @change="selectAttachment"
          />

          <v-btn
            aria-label="Adjuntar archivo"
            color="primary"
            icon="mdi-paperclip"
            :disabled="messageSending"
            size="large"
            variant="text"
            @click="fileInput?.click()"
          />

          <v-text-field
            v-model="message"
            autocomplete="off"
            color="primary"
            density="comfortable"
            :disabled="messageSending"
            hide-details
            placeholder="Escribe un mensaje"
            prepend-inner-icon="mdi-message-outline"
            variant="outlined"
          />

          <v-btn
            color="primary"
            icon="mdi-send"
            :loading="messageSending"
            size="large"
            type="submit"
            variant="flat"
          />
        </v-form>
      </section>

      <section v-else class="chat-content empty-chat-content">
        <v-icon color="primary" icon="mdi-chat-outline" size="44" />
        <span>Selecciona un chat para ver la conversacion.</span>
      </section>
    </v-card>
  </v-container>
</template>

<style scoped>
.chat-view {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 24px;
  background: rgb(var(--v-theme-appBackground));
}

.chat-shell {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1080px);
  justify-content: center;
  gap: 16px;
  height: calc(100vh - 48px);
  width: min(100%, 1436px);
  margin: 0 auto;
  min-width: 0;
  overflow: visible;
  background: transparent;
}

.chat-sidebar {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 20px;
  overflow: hidden;
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}

.sidebar-header,
.conversation-header,
.conversation-user,
.conversation-actions,
.message-composer {
  display: flex;
  align-items: center;
}

.sidebar-header,
.conversation-header {
  justify-content: space-between;
  gap: 16px;
}

.sidebar-header > div,
.conversation-user > div {
  min-width: 0;
}

.section-label {
  margin: 0 0 2px;
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.86rem;
}

h1,
h2 {
  margin: 0;
  color: rgb(var(--v-theme-textPrimary));
  line-height: 1.2;
}

h1 {
  font-size: 1.6rem;
}

h2 {
  font-size: 1.1rem;
}

h2,
.chat-list :deep(.v-list-item-title),
.chat-list :deep(.v-list-item-subtitle),
.conversation-user p {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-search {
  flex: 0 0 auto;
  margin: 16px 0 10px;
  font-size: 0.86rem;
}

.chat-search :deep(.v-input__control) {
  display: block;
  height: 34px;
}

.chat-search :deep(.v-field) {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  height: 34px;
  min-height: 34px;
  --v-field-padding-start: 10px;
  --v-field-padding-end: 10px;
  --v-input-control-height: 34px;
}

.chat-search :deep(.v-field__field) {
  display: block;
  height: 34px;
}

.chat-search :deep(.v-field__input) {
  height: 34px;
  min-height: 34px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 0.86rem;
  line-height: 34px;
}

.chat-search :deep(.v-field__prepend-inner) {
  align-items: center;
  height: 34px;
  min-height: 34px;
  padding-top: 0;
}

.chat-search :deep(.v-icon) {
  font-size: 18px;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.chat-state,
.empty-messages,
.empty-chat-content {
  display: grid;
  place-items: center;
  gap: 10px;
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.9rem;
  text-align: center;
}

.chat-state {
  flex: 1;
  padding: 24px 12px;
}

.chat-state-error {
  color: rgb(var(--v-theme-error));
}

.chat-list-item {
  margin-bottom: 8px;
}

.chat-list-item :deep(.v-list-item__content) {
  min-width: 0;
}

.avatar-text {
  color: rgb(var(--v-theme-surface));
  font-weight: 700;
}

.chat-meta {
  display: grid;
  justify-items: end;
  gap: 6px;
  min-width: 42px;
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.78rem;
}

.chat-content {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}

.conversation-header {
  padding: 18px 24px;
  border-bottom: 1px solid rgb(var(--v-theme-border));
}

.conversation-user {
  min-width: 0;
  gap: 12px;
}

.conversation-actions {
  flex: 0 0 auto;
  gap: 4px;
}

.conversation-actions :deep(.pa-4) {
  padding: 0 !important;
}

.message-search {
  width: 220px;
}

.message-search-count {
  min-width: 34px;
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.76rem;
  text-align: center;
}

.message-row-search-match .message-bubble {
  box-shadow: 0 0 0 2px rgb(var(--v-theme-warning));
}

.message-row-search-active .message-bubble {
  box-shadow: 0 0 0 3px orangered;
}

.message-bubble mark {
  padding: 0 2px;
  border-radius: 2px;
  background: rgb(var(--v-theme-warning));
  color: rgb(var(--v-theme-on-warning));
}

.mobile-back-button {
  display: none;
}

.conversation-user p {
  margin: 3px 0 0;
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.86rem;
}

.conversation-user .conversation-error {
  color: rgb(var(--v-theme-error));
}

.messages-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding: 24px;
  background:
    linear-gradient(135deg, rgb(var(--v-theme-primary) / 10%), transparent 36%),
    linear-gradient(315deg, rgb(var(--v-theme-secondary) / 8%), transparent 42%),
    #eef3f6;
}

.empty-messages {
  flex: 1;
  min-height: 220px;
}

.messages-error {
  color: rgb(var(--v-theme-error));
}

.empty-chat-content {
  align-content: center;
  padding: 24px;
}

.message-row {
  display: flex;
  justify-content: flex-start;
}

.message-row-sent {
  justify-content: flex-end;
}

.message-bubble {
  max-width: min(78%, 760px);
  padding: 12px 14px;
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-textPrimary));
  overflow-wrap: anywhere;
}

.message-row-sent .message-bubble {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-surface));
}

.message-bubble p {
  margin: 4px 0 0;
}

.message-bubble small {
  display: block;
  opacity: 0.82;
  font-size: 0.72rem;
  font-weight: 700;
}

.message-bubble span {
  display: block;
  margin-top: 4px;
  opacity: 0.72;
  font-size: 0.76rem;
  text-align: right;
}

.message-attachments {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.message-attachment {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 220px;
  padding: 8px;
  border-radius: 6px;
  background: rgb(var(--v-theme-surface) / 16%);
}

.attachment-image-preview {
  width: 74px;
  height: 74px;
  border-radius: 4px;
  object-fit: cover;
}

.attachment-details {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.attachment-details > span {
  margin: 0;
  overflow: hidden;
  font-size: 0.8rem;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-row:not(.message-row-sent) .message-attachment {
  background: rgb(var(--v-theme-primary) / 8%);
}

.message-composer {
  position: relative;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgb(var(--v-theme-border));
}

.message-composer :deep(.v-input) {
  flex: 1 1 0;
  min-width: 0;
}

.message-composer :deep(.v-btn) {
  flex: 0 0 auto;
}

.attachment-input {
  display: none;
}

.attachment-preview {
  display: flex;
  flex: 0 0 100%;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.84rem;
}

.attachment-preview span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-preview :deep(.v-btn) {
  margin-left: auto;
}

.send-message-error {
  flex: 0 0 100%;
  color: rgb(var(--v-theme-error));
  font-size: 0.84rem;
}

@media (max-width: 900px) {
  .chat-view {
    height: 100svh;
    height: 100dvh;
    min-height: 0;
    padding: 0;
    overflow: hidden;
  }

  .chat-shell {
    display: block;
    height: 100svh;
    height: 100dvh;
    overflow: hidden;
    border: 0;
    border-radius: 0;
  }

  .chat-sidebar {
    height: 100svh;
    height: 100dvh;
    padding: calc(14px + env(safe-area-inset-top)) 14px 14px;
    border: 0;
    border-radius: 0;
  }

  .chat-content {
    display: none;
    height: 100svh;
    height: 100dvh;
    border: 0;
    border-radius: 0;
  }

  .chat-shell.is-conversation-open .chat-sidebar {
    display: none;
  }

  .chat-shell.is-conversation-open .chat-content {
    display: grid;
  }

  .conversation-header {
    padding: calc(10px + env(safe-area-inset-top)) 12px 10px;
    gap: 8px;
  }

  .conversation-actions {
    gap: 2px;
  }

  .message-search {
    width: 150px;
  }

  .conversation-actions :deep(.v-btn) {
    width: 40px;
    height: 40px;
  }

  .mobile-back-button {
    display: inline-grid;
    flex: 0 0 auto;
  }

  .conversation-user {
    gap: 8px;
  }

  .conversation-user :deep(.v-avatar) {
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
  }

  h2 {
    font-size: 1rem;
  }

  .messages-panel {
    gap: 10px;
    padding: 14px 12px;
  }

  .message-bubble {
    max-width: 90%;
    padding: 10px 12px;
    font-size: 0.92rem;
  }

  .message-composer {
    flex-wrap: nowrap;
    gap: 8px;
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
    background: rgb(var(--v-theme-surface));
  }

  .message-composer :deep(.v-btn) {
    width: 44px;
    height: 44px;
  }

  .attachment-preview {
    position: absolute;
    right: 12px;
    bottom: calc(64px + env(safe-area-inset-bottom));
    left: 12px;
    flex-basis: auto;
    padding: 6px 8px;
    border: 1px solid rgb(var(--v-theme-border));
    border-radius: 6px;
    background: rgb(var(--v-theme-surface));
  }
}

@media (max-width: 520px) {
  .sidebar-header {
    align-items: center;
    gap: 10px;
  }

  h1 {
    font-size: 1.35rem;
  }

  h2 {
    max-width: none;
  }

  .chat-search {
    margin-top: 12px;
  }

  .chat-list-item {
    margin-bottom: 6px;
  }

  .chat-list-item :deep(.v-avatar) {
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
  }

  .chat-meta {
    min-width: 34px;
    font-size: 0.72rem;
  }

  .message-bubble {
    max-width: 92%;
    padding: 10px 12px;
  }
}

@media (max-width: 380px) {
  .chat-sidebar {
    padding-right: 10px;
    padding-left: 10px;
  }

  .conversation-header {
    padding-right: 8px;
    padding-left: 8px;
  }

  .conversation-actions {
    gap: 0;
  }

  .conversation-actions :deep(.v-btn),
  .mobile-back-button {
    width: 36px;
    height: 36px;
  }

  .messages-panel {
    padding-right: 10px;
    padding-left: 10px;
  }

  .message-bubble {
    max-width: 94%;
  }

  .message-composer {
    padding-right: 10px;
    padding-left: 10px;
  }
}
</style>
