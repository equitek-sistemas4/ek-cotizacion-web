<template>
  <div class="users-view pa-6">
    <v-container>
      <v-card>
        <v-card-title>
          <div class="d-flex justify-space-between align-center mb-6" style="padding: 10px">
            <h1 class="text-h4">Usuarios</h1>
            <!--<dialogCreateUser @user-created="loadUsers">
              <template #activator="{ props }">
                <v-btn v-bind="props" color="primary" prepend-icon="mdi-plus">
                  Nuevo usuario
                </v-btn>
              </template>
            </dialogCreateUser>-->
          </div>
        </v-card-title>
        <v-divider />
        <v-data-table
          :headers="headers"
          :items="users"
          :loading="loading"
          class="users-table elevation-0"
          style="padding: 10px"
        >
          <!--<template #item.actions="{ item }">
            <div class="d-flex gap-2">
              <v-btn
                color="primary"
                icon="mdi-pencil-outline"
                size="large"
                title="Editar"
                variant="text"
                @click="editUser(item)"
              />
              <v-btn
                color="error"
                icon="mdi-delete-forever"
                size="large"
                title="Eliminar"
                variant="text"
                @click="deleteUserConfirm(item)"
              />
            </div>
          </template>-->

          <template #no-data>
            <v-empty-state
              headline="Sin usuarios"
              text="No hay usuarios registrados"
              icon="mdi-account-group"
            />
          </template>
        </v-data-table>
      </v-card>
    </v-container>

    <dialogEditUser v-model="editDialog" :user="userToEdit" @user-updated="loadUsers" />

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Eliminar usuario</v-card-title>
        <v-card-text>
          ¿Estás seguro de que deseas eliminar a <strong>{{ selectedUser?.name }}</strong>? Esta acción no
          se puede deshacer.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="tonal" :loading="deleting" @click="confirmDelete">
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <MessageAlertDialog
      v-model="alertDialog"
      :message="alertMessage"
      :title="alertTitle"
      :type="alertType"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { deleteUser, getUsers } from '@/services/users'
import dialogCreateUser from '@/components/dialogCreateUser.vue'
import dialogEditUser from '@/components/dialogEditUser.vue'
import MessageAlertDialog from '@/components/MessageAlertDialog.vue'

const users = ref([])
const loading = ref(false)
const editDialog = ref(false)
const userToEdit = ref(null)
const deleteDialog = ref(false)
const deleting = ref(false)
const selectedUser = ref(null)
const alertDialog = ref(false)
const alertType = ref('error')
const alertTitle = ref('')
const alertMessage = ref('')

const headers = [
  { title: 'Nombre', key: 'name', align: 'start' },
  { title: 'Correo electrónico', key: 'email', align: 'start' },
  { title: 'Teléfono', key: 'phone_number', align: 'start' },
  //{ title: 'Acciones', key: 'actions', align: 'start', sortable: false },
]

const editUser = (user) => {
  userToEdit.value = user
  editDialog.value = true
}

const deleteUserConfirm = (user) => {
  selectedUser.value = user
  deleteDialog.value = true
}

const showAlert = ({ type, title, message }) => {
  alertType.value = type
  alertTitle.value = title
  alertMessage.value = message
  alertDialog.value = true
}

const confirmDelete = async () => {
  if (!selectedUser.value) return

  deleting.value = true

  try {
    await deleteUser({ user_id: selectedUser.value.user_id ?? selectedUser.value.id })
    deleteDialog.value = false
    await loadUsers()
  } catch (error) {
    console.error('Error al eliminar usuario:', error)
    showAlert({
      type: 'error',
      title: 'Error al eliminar usuario',
      message:
        error.response?.data?.message || 'No se pudo eliminar el usuario. Por favor, intenta de nuevo.',
    })
  } finally {
    deleting.value = false
  }
}

const loadUsers = async () => {
  loading.value = true

  try {
    users.value = await getUsers()
  } catch (error) {
    console.error('Error al cargar usuarios:', error)
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.users-view {
  min-height: 100vh;
  background-color: var(--vt-c-bg);
}

.users-table :deep(thead th) {
  background-color: rgba(var(--v-theme-primary), 0.05);
  border-bottom: 1px solid rgb(var(--v-theme-border));
  color: rgb(var(--v-theme-textPrimary));
  font-weight: 600;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
