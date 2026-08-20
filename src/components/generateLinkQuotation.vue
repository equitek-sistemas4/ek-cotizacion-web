<template>
  <div class="pa-4 text-center">
    <MessageAlertDialog
      v-model="alertDialog"
      :message="alertMessage"
      :title="alertTitle"
      :type="alertType"
    />

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

      <v-btn
        aria-label="Crear chat"
        color="primary"
        icon="mdi-chat-plus"
        @click="dialog = true"
      ></v-btn>

      <v-btn
        aria-label="Crear conversación de WhatsApp"
        color="success"
        icon="mdi-whatsapp"
        @click="whatsappDialog = true"
      ></v-btn>
    </v-speed-dial>

    <v-dialog
      v-model="dialog"
      max-width="600"
    >
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
                hint="Numero de Cotizacion"
                label="# Cotizacion"
                type="number"
                v-model="quotationId"
              ></v-text-field>
            </v-col>

            <v-col
              cols="12"
            >
              <v-text-field
                autocomplete="off"
                hint="Nombre de la empresa"
                label="Nombre de la empresa"
                v-model="chatName"
              ></v-text-field>
            </v-col>

            <v-col cols="12">
              <v-text-field
                autocomplete="off"
                hint="Descripcion de la cotizacion"
                label="Descripcion"
                v-model="chatDescription"
              >
              </v-text-field>
            </v-col>

            <v-col
              cols="12"
            >
              <v-autocomplete
                autocomplete="off"
                v-model="contactId"
                :disabled="isUpdating"
                :items="contacts"
                item-title="name"
                item-value="id"
                label="Contactos"
                chips
                closable-chips
                multiple
                required
                return-object
              >
                <template v-slot:chip="{ props, item }">
                  <v-chip
                    v-bind="props"
                    :text="item.raw.name"
                  ></v-chip>
                </template>

                <template v-slot:item="{ props, item }">
                  <v-list-item
                    v-bind="props"
                    :subtitle="item.raw.company"
                    :title="item.raw.name"
                  ></v-list-item>
                </template>
              </v-autocomplete>
              <!--<v-select
                :items="contacts"
                item-title="name"
                item-value="id"
                v-model="contactId"
                label="Contacto"
                required
              ></v-select>-->
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
    import { createLinkQuotation, getQuotationContacts } from '@/services/quotations'
    import { createContact, validateContactCompany } from '@/services/contacts'
    import MessageAlertDialog from '@/components/MessageAlertDialog.vue'
    import dialogCreateWhatsappChat from '@/components/dialogCreateWhatsappChat.vue'

    const emit = defineEmits(['created'])

    const authStore = useAuthStore()
    const dialog = shallowRef(false)
    const whatsappDialog = shallowRef(false)
    const contacts = ref([])
    const chatsError = ref('')
    const userId = ref(null)
    const chatName = ref('')
    const chatDescription = ref('')
    const quotationId = ref(null)
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

    const handleWhatsappChatCreated = (createdChat) => {
        emit('created', createdChat)
    }

    const clearForm = () => {
        chatName.value = ''
        contactId.value = null
    }


    const loadQuotationContacts = async (quotation_id) => {
        contactsError.value = ''
        contactId.value = null

        if (!quotation_id) {
            contacts.value = []
            return
        }

        try {
            const contactsList = await getQuotationContacts(quotation_id)
            contacts.value = Array.isArray(contactsList)
                ? contactsList.map((contact) => ({
                    ...contact,
                    id: contact.id ?? contact.idempresa_contacto,
                    name: contact.nombre ?? contact.name ?? '',
                    company: contact.empresa ?? contact.company ?? '',
                }))
                : []
        } catch (error) {
            contactsError.value = error.message || 'Ocurrio un error al cargar los contactos.'
            contacts.value = []
        }
    }

    const createChat = async () => {
        chatsError.value = ''

        try {
            const selectedContacts = Array.isArray(contactId.value) ? contactId.value : []

            if (!selectedContacts.length) {
                throw new Error('Selecciona al menos un contacto.')
            }

            const contactIds = await Promise.all(selectedContacts.map(async (contact) => {
                console.log('Selected contact:', contact)
                const companyContactId = contact.idempresa_contacto

                if (!companyContactId) {
                    throw new Error('El contacto seleccionado no tiene un identificador de empresa.')
                }

                const validatedContact = await validateContactCompany(companyContactId)
                console.log('Validated contact:', validatedContact)

                if (validatedContact?.exists === false) {
                    const createdContact = await createContact({
                        name: contact.nombre ?? contact.name ?? '',
                        phone_number: contact.tel_directo ?? contact.phone_number ?? contact.phone ?? '',
                        display_name: contact.nombre ?? contact.display_name ?? contact.nombre ?? contact.name ?? '',
                        company: contact.empresa ?? contact.company ?? '',
                        position: contact.funcion ?? contact.position ?? contact.funcion ?? '',
                        idempresa_contacto: companyContactId,
                        fk_idempresa: contact.fk_idempresa ?? contact.fk_idempresa,
                    })
                    const createdContactId = createdContact?.id ?? createdContact?.contact_id

                    if (!createdContactId) {
                        throw new Error('No se obtuvo el identificador del contacto creado.')
                    }

                    return createdContactId
                }

                const existingContactId = validatedContact?.data.id
                console.log('Existing contact ID:', existingContactId)
                if (!existingContactId) {
                    throw new Error('No se pudo validar el contacto seleccionado.')
                }

                return existingContactId
            }))

            newChat.value = await createLinkQuotation({
                name: chatName.value,
                description: chatDescription.value,
                user_id: userId.value,
                contact_ids: contactIds,
                quotation_id: quotationId.value
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
    })

    watch(quotationId, loadQuotationContacts, { immediate: true })

    watch(dialog, (isOpen) => {
        if (!isOpen) {
            clearForm()
        }
    })

</script>
