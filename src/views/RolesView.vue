<template>
  <div class="roles-view pa-6">
    <v-container>
      <div class="d-flex justify-space-between align-center mb-6 roles-header">
        <h1 class="text-h4">Roles</h1>
        <dialog-create-role @role-created="loadRoles">
          <template #activator="{ props }">
            <v-btn v-bind="props" color="primary" prepend-icon="mdi-plus">Agregar rol</v-btn>
          </template>
        </dialog-create-role>
      </div>

      <v-row v-if="loading">
        <v-col v-for="index in 3" :key="index" cols="12" md="6" lg="4">
          <v-skeleton-loader type="card" />
        </v-col>
      </v-row>

      <v-row v-else-if="roles.length">
        <v-col v-for="role in roles" :key="role.id" cols="12" md="6" lg="4">
          <v-card class="role-card" height="100%">
            <v-card-title class="d-flex align-center justify-space-between">
              <span class="text-h6">{{ role.name }}</span>
              <div class="d-flex gap-1">
                <add-permission-dialog :role="role">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      color="green"
                      icon="mdi-briefcase-plus"
                      size="small"
                      title="Agregar permiso"
                      variant="text"
                    />
                  </template>
                </add-permission-dialog>
                <dialog-view-permissions :role="role">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      color="primary"
                      icon="mdi-eye-outline"
                      size="small"
                      title="Ver permisos"
                      variant="text"
                    />
                  </template>
                </dialog-view-permissions>
                <v-btn
                  color="error"
                  icon="mdi-delete-outline"
                  size="small"
                  title="Eliminar rol"
                  variant="text"
                />
              </div>
            </v-card-title>
            <v-card-text class="text-medium-emphasis">
              {{ role.description || 'Sin descripción' }}
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-empty-state
        v-else
        headline="Sin roles"
        text="No hay roles registrados"
        icon="mdi-shield-account-outline"
      />
    </v-container>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import DialogCreateRole from '@/components/dialogCreateRole.vue'
import AddPermissionDialog from '@/components/addPermissionDialog.vue'
import DialogViewPermissions from '@/components/dialogViewPermissions.vue'
import { getRoles } from '@/services/roles'

const roles = ref([])
const loading = ref(false)

const loadRoles = async () => {
  loading.value = true

  try {
    roles.value = await getRoles()
  } catch (error) {
    console.error('Error al cargar roles:', error)
  } finally {
    loading.value = false
  }
}

onMounted(loadRoles)
</script>

<style scoped>
.roles-view {
  min-height: 100vh;
  background-color: var(--vt-c-bg);
}

.role-card {
  border: 1px solid rgb(var(--v-theme-border));
}

.gap-1 {
  gap: 0.25rem;
}
</style>
