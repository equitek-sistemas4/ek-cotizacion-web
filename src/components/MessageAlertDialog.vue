<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: 'success',
    validator: (value) => ['success', 'error', 'info', 'warning'].includes(value),
  },
  title: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const closeDialog = () => {
  emit('update:modelValue', false)
}
</script>

<template>
  <v-dialog :model-value="props.modelValue" max-width="420" @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-card-text class="message-alert-content">
        <v-icon :color="props.type" :icon="`mdi-${props.type === 'error' ? 'alert-circle' : 'check-circle'}`" size="44" />

        <div>
          <h2>{{ props.title }}</h2>
          <p>{{ props.message }}</p>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" text="Aceptar" variant="flat" @click="closeDialog" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.message-alert-content {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  padding-top: 24px;
}

h2 {
  margin: 0;
  color: rgb(var(--v-theme-textPrimary));
  font-size: 1.12rem;
  line-height: 1.2;
}

p {
  margin: 6px 0 0;
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.92rem;
}
</style>
