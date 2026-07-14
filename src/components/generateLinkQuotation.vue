<template>
  <div class="pa-4 text-center">
    <MessageAlertDialog
      v-model="alertDialog"
      :message="alertMessage"
      :title="alertTitle"
      :type="alertType"
    />

    <v-dialog
      v-model="dialog"
      max-width="600"
    >
      <template v-slot:activator="{ props: activatorProps }">
        <v-btn
          class="text-none font-weight-regular"
          icon="mdi-plus"
          variant="elevated"
          color="primary"
          v-bind="activatorProps"
        ></v-btn>
      </template>

      <v-card
        prepend-icon="mdi-chat-plus"
        title="Crear chat"
      >
        <v-card-text>
          <v-row density="comfortable">

            <v-col
              cols="12"
            >
              <v-text-field
                autocomplete="off"
                hint="Nombre del nuevo chat"
                label="Nombre del chat"
                v-model="chatName"
              ></v-text-field>
            </v-col>

            <v-col
              cols="12"
            >
              <v-select
                :items="contacts"
                item-title="name"
                item-value="id"
                v-model="contactId"
                label="Contacto"
                required
              ></v-select>
            </v-col>

          </v-row>

        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn
            color="secondary"
            text="Cerrar"
            variant="elevated"
            @click="dialog = false"
          ></v-btn>

          <v-btn
            color="primary"
            text="Agregar"
            variant="elevated"
            @click=createChat()
          ></v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
    import { shallowRef, onMounted, ref, watch } from 'vue'
    import { useAuthStore } from '@/stores/auth'
    import { createLinkQuotation } from '@/services/quotations'
    import { getContacts } from '@/services/contacts'
    import MessageAlertDialog from '@/components/MessageAlertDialog.vue'

    const emit = defineEmits(['created'])

    const authStore = useAuthStore()
    const dialog = shallowRef(false)
    const contacts = ref([])
    const chatsError = ref('')
    const userId = ref(null)
    const chatName = ref('')
    const contactId = ref(null)
    const newChat = ref(null)
    const contactsError = ref('')
    const alertDialog = ref(false)
    const alertType = ref('success')
    const alertTitle = ref('')
    const alertMessage = ref('')

    const showAlert = ({ type, title, message }) => {
        alertType.value = type
        alertTitle.value = title
        alertMessage.value = message
        alertDialog.value = true
    }

    const clearForm = () => {
        chatName.value = ''
        contactId.value = null
    }


    const fetchContacts = async () => {
        contactsError.value = ''

        try {
            const contactsList = await getContacts()
            contacts.value = contactsList
        } catch (error) {
            contactsError.value = error.message || 'Ocurrio un error al cargar los contactos.'
        }
    }

    const createChat = async () => {
        chatsError.value = ''

        try {
            newChat.value = await createLinkQuotation({
                name: chatName.value,
                user_id: userId.value,
                contact_id: contactId.value,
            })
            showAlert({
                type: 'success',
                title: 'Chat creado',
                message: 'El enlace de cotizacion se creo correctamente.',
            })
            emit('created', newChat.value)
            dialog.value = false
        } catch (error) {
            chatsError.value = error.message || 'Ocurrio un error al crear el chat.'
            showAlert({
                type: 'error',
                title: 'No se pudo crear el chat',
                message: chatsError.value,
            })
        }
    }

    onMounted(() => {
        userId.value = authStore.userId
        fetchContacts()
    })

    watch(dialog, (isOpen) => {
        if (!isOpen) {
            clearForm()
        }
    })

</script>
