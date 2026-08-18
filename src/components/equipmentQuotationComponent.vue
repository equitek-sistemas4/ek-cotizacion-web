<script setup>
import { ref, watch } from 'vue'
import { getQuotationEquipment, getQuotationInfo, getQuotationScopes } from '@/services/quotations'

const equipmentImages = import.meta.glob('../assets/Equipos/*/Equipo-*', {
  eager: true,
  import: 'default',
})
const defaultEquipmentImage = 'https://camarasal.com/wp-content/uploads/2020/08/default-image-5-1.jpg'

const props = defineProps({
  quotationId: { type: [Number, String], default: null },
  accessToken: { type: String, default: '' },
})

const loading = ref(false)
const errorMessage = ref('')
const equipment = ref([])
const quotationInfo = ref(null)
const prospectInfo = ref(null)
const scopeEquipment = ref([])
const presentations = ref([])

const baseScopeHeaders = [
  { title: 'Alcance', key: 'alcance' },
  { title: 'Mínimo', key: 'minimo', align: 'end' },
  { title: 'Máximo', key: 'maximo', align: 'end' },
  { title: 'Unidad', key: 'medida' },
]

const formatCurrency = (value) => {
  if (value === null || value === undefined) {
    return 'Sin información'
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(value))
}

const quotationHeading = () => {
  const quotationNumber = quotationInfo.value?.idcoti ?? props.quotationId
  const company = quotationInfo.value?.empresa ?? prospectInfo.value?.empresa

  return company ? `Cotización #${quotationNumber} - ${company}` : `Cotización #${quotationNumber}`
}

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
  (item?.Alcances ?? item?.alcances ?? []).map((scope) => {
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

const getEquipmentScopes = (item) => scopeEquipment.value.find(
  (scopeItem) => String(scopeItem.idcequipos) === String(item.idcequipos),
)

const getEquipmentImage = (serie) => {
  const normalizedSerie = String(serie || '').trim().toUpperCase()

  if (!normalizedSerie) return defaultEquipmentImage

  return Object.entries(equipmentImages).find(([path]) =>
    path.includes(`/Equipos/${normalizedSerie}/Equipo-${normalizedSerie}.`),
  )?.[1] || defaultEquipmentImage
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

const loadScopes = async () => {
  if (!props.quotationId) {
    scopeEquipment.value = []
    presentations.value = []
    return
  }

  try {
    const response = await getQuotationScopes(props.quotationId, {
      accessToken: props.accessToken,
    })

    scopeEquipment.value = Array.isArray(response) ? response : response?.Equipos ?? []
    presentations.value = response?.Presentaciones ?? []
  } catch {
    scopeEquipment.value = []
    presentations.value = []
  }
}

const loadQuotationInfo = async () => {
  if (!props.quotationId) {
    quotationInfo.value = null
    prospectInfo.value = null
    return
  }

  try {
    const response = await getQuotationInfo(props.quotationId, {
      accessToken: props.accessToken,
    })

    quotationInfo.value = response?.quotation_info ?? null
    prospectInfo.value = response?.quotation_prospect_info ?? null
  } catch {
    quotationInfo.value = null
    prospectInfo.value = null
  }
}

watch(() => [props.quotationId, props.accessToken], () => {
  loadEquipment()
  loadScopes()
  loadQuotationInfo()
}, { immediate: true })
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
        <p class="equipment-eyebrow">{{ quotationHeading() }}</p>
        <h1>Equipos cotizados</h1>
      </div>

      <div class="equipment-list">
        <v-card v-for="item in equipment" :key="item.idcequipos" variant="elevated">
          <v-card-title class="equipment-title">
            <div>
              <!--<p>{{ item.familia }}</p>-->
              <v-chip color="default" variant="flat">{{ item.familia }}</v-chip>
              <h2>Modelo: {{ item.modelo }}</h2>
            </div>
            <!--<strong>{{ formatCurrency(item.costoactual ?? item.costo) }}</strong>-->
            <!--<v-chip color="green" variant="flat">{{ formatCurrency(item.costoactual ?? item.costo) }}</v-chip>-->
          </v-card-title>

          <v-card-text class="equipment-content">
            <v-row>
              <v-col cols="6">
                <p>{{ item.descripcion }}</p>

                <br />

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
              </v-col>

              <v-col cols="6">
                <v-img
                  :src="getEquipmentImage(item.serie)"
                  alt="Imagen del equipo"
                  class="equipment-image"
                  contain
                />
              </v-col>

              <v-col v-if="getEquipmentScopes(item)" cols="12" class="equipment-scopes-column">
                <v-expansion-panels variant="accordion">
                  <v-expansion-panel title="Alcances del equipo">
                    <v-expansion-panel-text>
                      <v-alert v-if="!scopeRows(getEquipmentScopes(item)).length" type="info" variant="tonal">
                        Este equipo no tiene alcances registrados.
                      </v-alert>
                      <div v-else class="equipment-scopes-table">
                        <v-data-table
                          class="equipment-scopes-data-table"
                          :headers="scopeHeaders()"
                          :items="scopeRows(getEquipmentScopes(item))"
                          :items-per-page="-1"
                          density="comfortable"
                          hide-default-footer
                        >
                          <template #item.minimo="{ value }">{{ formatValue(value) }}</template>
                          <template #item.maximo="{ value }">{{ formatValue(value) }}</template>
                        </v-data-table>
                      </div>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-col>

              <v-col cols="12" class="equipment-image-column">
                <a v-if="item.serie_desc" :href="item.serie_desc" rel="noopener" target="_blank">
                  Ver información de la serie
                  <v-icon icon="mdi-open-in-new" size="small" />
                </a>
              </v-col>
            </v-row>

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
.equipment-image {
  width: 100%;
  margin-bottom: 16px;
  border-radius: 8px;
  aspect-ratio: 16 / 9;
}
.equipment-video {
  width: 100%;
  margin-bottom: 16px;
  border: 0;
  border-radius: 8px;
  aspect-ratio: 16 / 9;
}
.equipment-image-column {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.equipment-image-column a {
  align-self: flex-end;
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
  gap: 6px;
  width: fit-content;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-surface));
  font-weight: 700;
  text-decoration: none;
}
.equipment-scopes-table {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  contain: inline-size;
  overflow-x: auto;
  overflow-y: hidden;
}
.equipment-scopes-column,
.equipment-scopes-column :deep(.v-expansion-panels),
.equipment-scopes-column :deep(.v-expansion-panel),
.equipment-scopes-column :deep(.v-expansion-panel-text),
.equipment-scopes-column :deep(.v-expansion-panel-text__wrapper),
.equipment-scopes-table :deep(.v-data-table) {
  min-width: 0;
  max-width: none;
}
.equipment-scopes-table :deep(.equipment-scopes-data-table) {
  width: max-content;
  min-width: 100%;
  white-space: nowrap;
}
.equipment-scopes-table :deep(.v-table__wrapper) {
  overflow: visible;
}
.equipment-scopes-table :deep(table) {
  width: max-content !important;
  min-width: 100%;
  table-layout: auto;
}
.equipment-scopes-table :deep(th),
.equipment-scopes-table :deep(td) {
  white-space: nowrap;
}
@media (max-width: 500px) {
  .equipment-title {
    flex-direction: column;
  }
}
</style>
