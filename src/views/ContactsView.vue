<template>
  <div class="contacts-view pa-6">
    <v-container>
      <v-card>
        <v-card-title>
            <div class="d-flex justify-space-between align-center mb-6" style="padding: 10px;">
                <h1 class="text-h4">Contactos</h1>
                <dialogCreateContact @contact-created="handleContactCreated">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    color="primary"
                    prepend-icon="mdi-plus"
                    >
                    Nuevo Contacto
                    </v-btn>
                </template>
                </dialogCreateContact>
            </div>
        </v-card-title>
        <v-divider></v-divider>
        <v-data-table
          :headers="headers"
          :items="contacts"
          :loading="loading"
          class="elevation-0"
          style="padding: 10px;"
        >
          <template v-slot:item.actions="{ item }">
            <div class="d-flex gap-2">
              <dialogEditContact
                ref="editDialogRef"
                :contact="contactToEdit"
                @contact-updated="handleContactUpdated"
              >
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    color="primary"
                    @click.stop="editContact(item)"
                    title="Editar"
                  />
                </template>
              </dialogEditContact>
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
                @click="deleteContactConfirm(item)"
                title="Eliminar"
              />
            </div>
          </template>

          <template v-slot:no-data>
            <v-empty-state
              headline="Sin contactos"
              text="No hay contactos registrados"
              icon="mdi-contacts"
            />
          </template>
        </v-data-table>
      </v-card>
    </v-container>

    <!-- Diálogo de confirmación para eliminar -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Eliminar Contacto</v-card-title>
        <v-card-text>
          ¿Estás seguro de que deseas eliminar a <strong>{{ selectedContact?.name }}</strong>?
          Esta acción no se puede deshacer.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">
            Cancelar
          </v-btn>
          <v-btn color="error" variant="tonal" @click="confirmDelete">
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getContacts, deleteContact } from '@/services/contacts'
import dialogCreateContact from '@/components/dialogCreateContact.vue'
import dialogEditContact from '@/components/dialogEditContact.vue'

const contacts = ref([])
const loading = ref(false)
const deleteDialog = ref(false)
const selectedContact = ref(null)
const contactToEdit = ref(null)
const editDialogRef = ref(null)

const headers = [
  { title: 'Nombre', key: 'name', align: 'start' },
  { title: 'Teléfono', key: 'phone_number', align: 'start' },
  { title: 'Nombre Mostrado', key: 'display_name', align: 'start' },
  { title: 'Empresa', key: 'company', align: 'start' },
  { title: 'Acciones', key: 'actions', align: 'start', sortable: false },
]

const loadContacts = async () => {
  loading.value = true
  try {
    contacts.value = await getContacts()
  } catch (error) {
    console.error('Error al cargar contactos:', error)
  } finally {
    loading.value = false
  }
}

const editContact = (contact) => {
  contactToEdit.value = contact
  editDialogRef.value?.$el?.querySelector('[role="button"]')?.click()
}

const handleContactUpdated = async () => {
  await loadContacts()
}

const handleContactCreated = async () => {
  await loadContacts()
}

const deleteContactConfirm = (contact) => {
  selectedContact.value = contact
  deleteDialog.value = true
}

const confirmDelete = async () => {
  if (!selectedContact.value) return

  try {
    await deleteContact({ contact_id: selectedContact.value.id })
    deleteDialog.value = false
    await loadContacts()
  } catch (error) {
    console.error('Error al eliminar contacto:', error)
  }
}

onMounted(() => {
  loadContacts()
})
</script>

<style scoped>
.contacts-view {
  min-height: 100vh;
  background-color: var(--vt-c-bg);
}

.gap-2 {
  gap: 0.5rem;
}
</style>
