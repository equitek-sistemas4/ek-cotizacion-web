<script setup>
import { ref, watch } from 'vue'
import { getQuotationEquipment } from '@/services/quotations'

const props = defineProps({
  quotationId: { type: [Number, String], default: null },
  accessToken: { type: String, default: '' },
})

const loading = ref(false)
const errorMessage = ref('')
const equipment = ref([])

const formatCurrency = (value) => {
  if (value === null || value === undefined) {
    return 'Sin información'
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(value))
}

const loadEquipment = async () => {
  if (!props.quotationId) {
    equipment.value = []
    errorMessage.value = 'No fue posible identificar la cotización.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await getQuotationEquipment(props.quotationId, {
      accessToken: props.accessToken,
    })

    equipment.value = Array.isArray(response) ? response : []

    if (!equipment.value.length) {
      errorMessage.value = 'Esta cotización no tiene equipos registrados.'
    }
  } catch (error) {
    equipment.value = []
    errorMessage.value = error.message || 'No se pudieron obtener los equipos de la cotización.'
  } finally {
    loading.value = false
  }
}

watch(() => [props.quotationId, props.accessToken], loadEquipment, { immediate: true })
</script>

<template>
  <section class="equipment-quotation">
    <div v-if="loading" class="equipment-state">
      <v-progress-circular color="primary" indeterminate size="32" />
      <span>Cargando equipos de la cotización...</span>
    </div>

    <v-alert v-else-if="errorMessage" type="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <template v-else>
      <div>
        <p class="equipment-eyebrow">Cotización</p>
        <h1>Equipos cotizados</h1>
      </div>

      <div class="equipment-list">
        <v-card v-for="item in equipment" :key="item.idcequipos" variant="elevated">
          <v-card-title class="equipment-title">
            <div>
              <!--<p>{{ item.familia }}</p>-->
              <v-chip color="default" variant="flat">{{ item.familia }}</v-chip>
              <h2>{{ item.modelo }}</h2>
            </div>
            <!--<strong>{{ formatCurrency(item.costoactual ?? item.costo) }}</strong>-->
            <v-chip color="green" variant="flat">{{ formatCurrency(item.costoactual ?? item.costo) }}</v-chip>
          </v-card-title>

          <v-card-text class="equipment-content">
            <p>{{ item.descripcion }}</p>

            <v-expansion-panels
              v-if="item.serietxt || item.descripcc || item.comentario"
              variant="accordion"
            >
              <v-expansion-panel v-if="item.serietxt" title="Descripción de la serie">
                <v-expansion-panel-text>{{ item.serietxt }}</v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel v-if="item.descripcc" title="Características de construcción">
                <v-expansion-panel-text>{{ item.descripcc }}</v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel v-if="item.comentario" title="Comentarios">
                <v-expansion-panel-text>{{ item.comentario }}</v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>

            <a v-if="item.serie_desc" :href="item.serie_desc" rel="noopener" target="_blank">
              Ver información de la serie
            </a>
          </v-card-text>
        </v-card>
      </div>
    </template>
  </section>
</template>

<style scoped>
.equipment-quotation,
.equipment-list,
.equipment-content {
  display: grid;
  gap: 24px;
}
.equipment-state {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 240px;
  color: rgb(var(--v-theme-textMuted));
}
.equipment-eyebrow,
.equipment-title p {
  margin: 0;
  color: rgb(var(--v-theme-primary));
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
h1 {
  margin: 8px 0 0;
  color: rgb(var(--v-theme-textPrimary));
  font-size: clamp(1.6rem, 4vw, 2.3rem);
  line-height: 1.2;
}
.equipment-title {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
  white-space: normal;
}
.equipment-title h2 {
  margin: 6px 0 0;
  font-size: 1.2rem;
}
.equipment-title strong {
  color: rgb(var(--v-theme-primary));
  white-space: nowrap;
}
.equipment-content > p,
.equipment-content :deep(.v-expansion-panel-text__wrapper) {
  margin: 0;
  color: rgb(var(--v-theme-textPrimary));
  line-height: 1.6;
  white-space: pre-line;
}
.equipment-content a {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-surface));
  font-weight: 700;
  text-decoration: none;
}
@media (max-width: 500px) {
  .equipment-title {
    flex-direction: column;
  }
}
</style>
