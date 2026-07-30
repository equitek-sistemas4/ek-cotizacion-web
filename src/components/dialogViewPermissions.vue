<template>
  <v-dialog v-model="dialog" max-width="900">
    <template #activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps">
        <v-btn v-bind="activatorProps" />
      </slot>
    </template>

    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Permisos de {{ role.name }}</span>
      </v-card-title>

      <v-card-text>
        <v-progress-linear v-if="loading" color="primary" indeterminate />

        <v-alert v-else-if="errorMessage" type="error">
          {{ errorMessage }}
        </v-alert>

        <v-data-table
          v-else
          :headers="headers"
          :items="permissions"
          :items-per-page="10"
          no-data-text="Este rol no tiene permisos asignados."
        >
          <template #[`item.name`]="{ item }">
            {{ getPermissionName(item) }}
          </template>

          <template #[`item.description`]="{ item }">
            {{ getPermissionDescription(item) || 'Sin descripción' }}
          </template>

          <template #[`item.actions`]="{ item }">
            <v-btn
              color="error"
              icon="mdi-delete-outline"
              :loading="deletingPermissionId === getRolePermissionId(item)"
              size="small"
              title="Eliminar permiso"
              variant="text"
              @click="removePermission(item)"
            />
          </template>
        </v-data-table>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="elevated" @click="dialog = false">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="addPermissionDialog" max-width="440">
    <v-card title="Añadir permiso">
      <v-card-text>
        <v-text-field
          v-model="permissionId"
          label="ID del permiso"
          placeholder="Ingresa el ID del permiso"
          type="number"
        />
        <v-alert v-if="addErrorMessage" class="mt-3" type="error">
          {{ addErrorMessage }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="elevated" @click="closeAddPermissionDialog">Cancelar</v-btn>
        <v-btn color="primary" :loading="addingPermission" variant="elevated" @click="addPermission">
          Añadir
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import {
  addPermissionsToRole,
  deleteRolePermission,
  getRolePermissions,
} from '@/services/roles'

const props = defineProps({
  role: {
    type: Object,
    required: true,
  },
})

const dialog = ref(false)
const addPermissionDialog = ref(false)
const permissions = ref([])
const loading = ref(false)
const addingPermission = ref(false)
const deletingPermissionId = ref(null)
const errorMessage = ref('')
const addErrorMessage = ref('')
const permissionId = ref('')

const headers = [
  { title: 'Permiso', key: 'name' },
  { title: 'Descripción', key: 'description' },
  { title: 'Acciones', key: 'actions', align: 'end', sortable: false },
]

const getPermission = (item) => item.permission || item
const getPermissionName = (item) => getPermission(item).name || getPermission(item).permission_name || '—'
const getPermissionDescription = (item) =>
  getPermission(item).description || getPermission(item).permission_description
const getRolePermissionId = (item) => item.role_permission_id || item.id

const loadPermissions = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    permissions.value = await getRolePermissions({ role_id: props.role.id })
  } catch (error) {
    console.error('Error al cargar permisos del rol:', error)
    errorMessage.value =
      error.response?.data?.message || 'No se pudieron cargar los permisos del rol.'
  } finally {
    loading.value = false
  }
}

const removePermission = async (permission) => {
  const rolePermissionId = getRolePermissionId(permission)

  if (!rolePermissionId) {
    errorMessage.value = 'No se identificó el permiso asignado al rol.'
    return
  }

  deletingPermissionId.value = rolePermissionId
  errorMessage.value = ''

  try {
    await deleteRolePermission({ role_permission_id: rolePermissionId })
    await loadPermissions()
  } catch (error) {
    console.error('Error al eliminar permiso del rol:', error)
    errorMessage.value =
      error.response?.data?.message || 'No se pudo eliminar el permiso del rol.'
  } finally {
    deletingPermissionId.value = null
  }
}

const closeAddPermissionDialog = () => {
  addPermissionDialog.value = false
  addErrorMessage.value = ''
  permissionId.value = ''
}

const addPermission = async () => {
  if (!permissionId.value) {
    addErrorMessage.value = 'El ID del permiso es requerido.'
    return
  }

  addingPermission.value = true
  addErrorMessage.value = ''

  try {
    await addPermissionsToRole({
      role_id: props.role.id,
      permission_id: permissionId.value,
    })
    closeAddPermissionDialog()
    await loadPermissions()
  } catch (error) {
    console.error('Error al añadir permiso al rol:', error)
    addErrorMessage.value =
      error.response?.data?.message || 'No se pudo añadir el permiso al rol.'
  } finally {
    addingPermission.value = false
  }
}

watch(dialog, (isOpen) => {
  if (isOpen) {
    loadPermissions()
  }
})
</script>
