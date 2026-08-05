<script setup>
import { ref, watch } from 'vue'
import { getQuotationScopes } from '@/services/quotations'

const props = defineProps({
  quotationId: { type: [Number, String], default: null },
  accessToken: { type: String, default: '' },
})

const loading = ref(false)
const errorMessage = ref('')
const equipment = ref([])
const presentations = ref([])

const presentationHeaders = [
  { title: 'Producto', key: 'producto' },
  { title: 'Presentación', key: 'presentacion' },
  { title: 'Producción por minuto', key: 'produccion' },
]

const baseScopeHeaders = [
  { title: 'Alcance', key: 'alcance' },
  { title: 'Mínimo', key: 'minimo', align: 'end' },
  { title: 'Máximo', key: 'maximo', align: 'end' },
  { title: 'Unidad', key: 'medida' },
]

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '—'

  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(Number(value))
}

const formatPresentation = (presentation) =>
  `${presentation.producto || 'Presentación'}: ${presentation.presentacion || '—'} ${presentation.medida || ''}`.trim()

const scopeHeaders = () => [
  ...baseScopeHeaders,
  ...presentations.value.map((presentation) => ({
    title: formatPresentation(presentation),
    key: `presentation_${presentation.idpresen}`,
    align: 'end',
  })),
]

const scopeRows = (item) =>
  (item.Alcances ?? item.alcances ?? []).map((scope) => {
    const values = Object.fromEntries(
      (scope.valores ?? []).map((value) => [
        `presentation_${value.idpresen}`,
        formatValue(value.valor),
      ]),
    )

    return {
      ...scope,
      minimo: formatValue(scope.minimo),
      maximo: formatValue(scope.maximo),
      ...values,
    }
  })

const loadScopes = async () => {
  if (!props.quotationId) {
    equipment.value = []
    presentations.value = []
    errorMessage.value = 'No fue posible identificar la cotización.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await getQuotationScopes(props.quotationId, {
      accessToken: props.accessToken,
    })

    equipment.value = Array.isArray(response) ? response : response?.Equipos ?? []
    presentations.value = response?.Presentaciones ?? []

    if (!equipment.value.length) {
      errorMessage.value = 'Esta cotización no tiene alcances registrados.'
    }
  } catch (error) {
    equipment.value = []
    presentations.value = []
    errorMessage.value = error.message || 'No se pudieron obtener los alcances de la cotización.'
  } finally {
    loading.value = false
  }
}

watch(() => [props.quotationId, props.accessToken], loadScopes, { immediate: true })
</script>

<template>
  <section class="scopes-quotation">
    <div v-if="loading" class="scopes-state">
      <v-progress-circular color="primary" indeterminate size="32" />
      <span>Cargando alcances de la cotización...</span>
    </div>

    <v-alert v-else-if="errorMessage" type="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <template v-else>
      <div>
        <p class="scopes-eyebrow">Cotización</p>
        <h1>Alcances de los equipos</h1>
      </div>

      <v-card v-if="presentations.length" variant="elevated">
        <v-card-title>Presentaciones cotizadas</v-card-title>
        <v-card-text>
          <v-data-table
            :headers="presentationHeaders"
            :items="presentations"
            :items-per-page="-1"
            density="comfortable"
            hide-default-footer
          >
            <template #item.presentacion="{ item }">
              {{ `${item.presentacion || '—'} ${item.medida || ''}`.trim() }}
            </template>
            <template #item.produccion="{ value }">{{ value ?? '—' }}</template>
          </v-data-table>
        </v-card-text>
      </v-card>

      <v-card v-for="item in equipment" :key="item.idcequipos" variant="elevated">
        <v-card-title class="equipment-title">
          <div>
            <v-chip v-if="item.familia" color="default" variant="flat">{{ item.familia }}</v-chip>
            <h2>{{ item.modelo || 'Equipo sin modelo' }}</h2>
          </div>
        </v-card-title>

        <v-card-subtitle v-if="item.familia_desc">{{ item.familia_desc }}</v-card-subtitle>

        <v-card-text>
          <v-alert v-if="!scopeRows(item).length" type="info" variant="tonal">
            Este equipo no tiene alcances registrados.
          </v-alert>
          <v-data-table
            v-else
            :headers="scopeHeaders()"
            :items="scopeRows(item)"
            :items-per-page="-1"
            density="comfortable"
            hide-default-footer
          >
            <template #item.minimo="{ value }">{{ formatValue(value) }}</template>
            <template #item.maximo="{ value }">{{ formatValue(value) }}</template>
          </v-data-table>
        </v-card-text>
      </v-card>

      <v-card>
        <v-card-text>
          <span>
            NOTA SOBRE ALCANCES:<br />
• En el caso de que no se tengan los alcances descritos por producto, en blanco, estos estarán limitados a los rangos estipulados por cada equipo, en este caso es responsabilidad del
cliente que los alcances por producto estén dentro del rango del equipo.<br />
• Los alcances en verde indican que los alcances del producto estan dentro del rango del equipo o bien estos serán modificados para aceptar dichos alcances. <br />
• Los alcances en rojo indica que el producto esta fuera del rango del equipo y que no podrá ser procesado por este.
          </span>
        </v-card-text>
      </v-card>

    </template>
  </section>
</template>

<style scoped>
.scopes-quotation {
  display: grid;
  gap: 24px;
}

.scopes-state {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 240px;
  color: rgb(var(--v-theme-textMuted));
}

.scopes-eyebrow {
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
  white-space: normal;
}

.equipment-title h2 {
  margin: 8px 0 0;
  font-size: 1.2rem;
}
</style>
