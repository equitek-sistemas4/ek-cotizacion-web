<template>
  <v-dialog v-model="dialog" max-width="700">
    <template #activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps">
        <v-btn v-bind="activatorProps" />
      </slot>
    </template>

    <v-card title="Añadir permisos al rol">
      <v-card-subtitle>{{ role.name }}</v-card-subtitle>
      <v-card-text>
        <v-progress-linear v-if="loading" color="primary" indeterminate />
        <v-alert v-else-if="errorMessage" type="error">{{ errorMessage }}</v-alert>

        <v-list v-else lines="two">
          <v-list-item v-for="permission in permissions" :key="getPermissionId(permission)">
            <template #prepend>
              <v-checkbox-btn
                :disabled="isAssigned(permission)"
                :model-value="isAssigned(permission) || selectedPermissionIds.includes(getPermissionId(permission))"
                @update:model-value="togglePermission(permission, $event)"
              />
            </template>
            <v-list-item-title>{{ getPermissionName(permission) }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ getPermissionDescription(permission) || 'Sin descripción' }}
              <span v-if="isAssigned(permission)"> · Ya asignado</span>
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item v-if="!permissions.length" title="No hay permisos disponibles." />
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="elevated" @click="closeDialog">Cancelar</v-btn>
        <v-btn color="primary" :disabled="!selectedPermissionIds.length" :loading="saving" @click="save">
          Aceptar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { addPermissionsToRole, getPermissions, getRolePermissions } from '@/services/roles'

const props = defineProps({
  role: { type: Object, required: true },
})
const emit = defineEmits(['permissions-added'])

const dialog = ref(false)
const permissions = ref([])
const assignedPermissionIds = ref([])
const selectedPermissionIds = ref([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')

const getPermissionId = (permission) => permission.id || permission.permission_id
const getPermissionName = (permission) => permission.name || permission.permission_name || '—'
const getPermissionDescription = (permission) => permission.description || permission.permission_description
const getAssignedPermissionId = (permission) =>
  permission.permission_id || permission.permission?.id || permission.id
const isAssigned = (permission) => assignedPermissionIds.value.includes(getPermissionId(permission))

const togglePermission = (permission, isSelected) => {
  const id = getPermissionId(permission)
  if (!id || isAssigned(permission)) return

  selectedPermissionIds.value = isSelected
    ? [...selectedPermissionIds.value, id]
    : selectedPermissionIds.value.filter((permissionId) => permissionId !== id)
}

const loadPermissions = async () => {
  loading.value = true
  errorMessage.value = ''
  selectedPermissionIds.value = []

  try {
    const [allPermissions, rolePermissions] = await Promise.all([
      getPermissions(),
      getRolePermissions({ role_id: props.role.id }),
    ])
    permissions.value = allPermissions
    assignedPermissionIds.value = rolePermissions.map(getAssignedPermissionId).filter(Boolean)
  } catch (error) {
    console.error('Error al cargar permisos:', error)
    errorMessage.value = error.response?.data?.message || 'No se pudieron cargar los permisos.'
  } finally {
    loading.value = false
  }
}

const closeDialog = () => {
  dialog.value = false
  selectedPermissionIds.value = []
  errorMessage.value = ''
}

const save = async () => {
  saving.value = true
  errorMessage.value = ''
  try {
    await addPermissionsToRole({ role_id: props.role.id, permission_ids: selectedPermissionIds.value })
    emit('permissions-added')
    closeDialog()
  } catch (error) {
    console.error('Error al añadir permisos al rol:', error)
    errorMessage.value = error.response?.data?.message || 'No se pudieron añadir los permisos.'
  } finally {
    saving.value = false
  }
}

watch(dialog, (isOpen) => {
  if (isOpen) loadPermissions()
})
</script>
