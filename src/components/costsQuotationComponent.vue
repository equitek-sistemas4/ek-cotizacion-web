<script setup>
import { computed, ref, watch } from 'vue'
import { getQuotationConditions, getQuotationEquipment, getQuotationInfo } from '@/services/quotations'

const props = defineProps({
  quotationId: { type: [Number, String], default: null },
  accessToken: { type: String, default: '' },
})

const loading = ref(false)
const errorMessage = ref('')
const equipment = ref([])
const conditions = ref([])
const quotationInfo = ref(null)
const prospectInfo = ref(null)
const discountRate = 0.2
const taxRate = 0.16
const equipmentHeaders = [
  { title: 'Familia', key: 'familia' },
  { title: 'Modelo', key: 'modelo' },
  { title: 'Descripción', key: 'descripcion' },
  { title: 'Costo', key: 'costo', align: 'end' },
]

const toNumber = (value) => {
  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) ? parsedValue : 0
}

const quotationTotals = computed(() => {
  const subtotal = equipment.value.reduce(
    (total, item) => total + toNumber(item.costoactual ?? item.costo),
    0,
  )
  const discount = subtotal * discountRate
  const extras = equipment.value.reduce(
    (total, item) => total + toNumber(item.extras ?? item.extra),
    0,
  )
  const beforeTax = subtotal - discount + extras
  const tax = beforeTax * taxRate

  return {
    subtotal,
    discount,
    extras,
    tax,
    total: beforeTax + tax,
  }
})

const formatCurrency = (value) => {
  if (value === null || value === undefined) {
    return 'Sin información'
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(value))
}

const truncateText = (text, maxLength = 230) => {
  if (!text) {
    return ''
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
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

const quotationHeading = () => {
  const quotationNumber = quotationInfo.value?.idcoti ?? props.quotationId
  const company = quotationInfo.value?.empresa ?? prospectInfo.value?.empresa

  return company ? `Cotización #${quotationNumber} - ${company}` : `Cotización #${quotationNumber}`
}

const loadConditions = async () => {
  if (!props.quotationId) {
    conditions.value = []
    return
  }

  try {
    const response = await getQuotationConditions(props.quotationId, {
      accessToken: props.accessToken,
    })

    conditions.value = Array.isArray(response) ? response : []
  } catch {
    conditions.value = []
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
  loadConditions()
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
        <v-data-table
          :headers="equipmentHeaders"
          :items="equipment"
          :items-per-page="-1"
          class="equipment-table"
          density="comfortable"
          hide-default-footer
        >
          <template #item.familia="{ value }">
            {{ value || '—' }}
          </template>
          <template #item.modelo="{ value }">{{ value || '—' }}</template>
          <template #item.descripcion="{ value }">
            <span :title="value">{{ truncateText(value) || '—' }}</span>
          </template>
          <template #item.costo="{ item }">
            <span class="equipment-cost">
              <strong>
                {{ formatCurrency(item.costoactual ?? item.costo) }}
              </strong>
            </span>
          </template>
        </v-data-table>
      </div>

      <v-card class="quotation-totals" variant="elevated">
        <v-table density="compact">
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td>{{ formatCurrency(quotationTotals.subtotal) }}</td>
            </tr>
            <tr>
              <td>Descuento (20.0000%)</td>
              <td>-{{ formatCurrency(quotationTotals.discount) }}</td>
            </tr>
            <tr>
              <td>Extras</td>
              <td>{{ formatCurrency(quotationTotals.extras) }}</td>
            </tr>
            <tr>
              <td>IVA (16%)</td>
              <td>{{ formatCurrency(quotationTotals.tax) }}</td>
            </tr>
            <tr class="quotation-total-row">
              <td>Total</td>
              <td>{{ formatCurrency(quotationTotals.total) }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <section class="conditions-section">
        <h2>Condiciones comerciales</h2>
        <v-row>
          <v-col cols="12" md="8">
            <div class="conditions-list">
              <v-card v-for="condition in conditions" :key="condition.idconds" variant="elevated">
                <v-card-title><strong>{{ condition.tipo }}</strong></v-card-title>
                <v-card-text>
                  <p class="condition-description">{{ condition.descripcion }}</p>
                  <p v-if="condition.nota" class="condition-note">Nota: {{ condition.nota }}</p>
                </v-card-text>
              </v-card>
            </div>
          </v-col>
          <v-col cols="12" md="4">
            <v-card>
              <v-card-title><strong>REFERENCIAS BANCARIAS</strong></v-card-title>
              <v-card-text>
                <span>
                  RFC: EQU-000919-7M3 <br /><br />
                  REFERENCIAS BANCARIAS <br />
                  Beneficiario: EQUITEK, S.A. DE C.V. <br /><br />
                  BANCO: BANAMEX Moneda: PESOS Sucursal: 4270 Cuenta: 14554 <br />
                  Clabe: 0025 8042 7000 1455 45 <br /><br />
                  BANCO: BANAMEX Moneda: DOLARES Sucursal: 4270 Cuenta: 9000521 <br />
                  Clabe: 0025 8042 7090 0052 13 <br /><br />
                  BANCO: BANCOMER Moneda: PESOS Sucursal: 003 Cuenta: 0453297500 <br />
                  Clabe: 0125 8000 4532 9750 07 <br /><br />
                  BANCO: BANCOMER Moneda: DOLARES Sucursal: 003 Cuenta: 0114655613 <br />
                  Clabe: 0125 8000 1146 5561 32
                </span>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </section>
    </template>
  </section>
</template>

<style scoped>
.equipment-quotation,
.equipment-list {
  display: grid;
  gap: 24px;
}
.equipment-table {
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 8px;
  overflow: hidden;
}
.equipment-table :deep(th:nth-child(4)),
.equipment-table :deep(td:nth-child(4)) {
  border-left: 1px solid rgb(var(--v-theme-border));
}
.equipment-cost {
  display: block;
  text-align: right;
  white-space: nowrap;
}
.equipment-state {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 240px;
  color: rgb(var(--v-theme-textMuted));
}
.quotation-totals {
  width: min(100%, 420px);
  justify-self: end;
}
.quotation-totals td:last-child {
  text-align: right;
  white-space: nowrap;
}
.quotation-total-row td {
  border-top: 1px solid rgb(var(--v-theme-border));
  color: rgb(var(--v-theme-primary));
  font-size: 1.05rem;
  font-weight: 700;
}
.conditions-section {
  display: grid;
  gap: 16px;
}
.conditions-section h2 {
  margin: 0;
  color: rgb(var(--v-theme-textPrimary));
  font-size: 1.4rem;
}
.conditions-list {
  display: grid;
  gap: 16px;
}
.conditions-list :deep(.v-card-title) {
  color: rgb(var(--v-theme-primary));
  font-size: 1rem;
  white-space: normal;
}
.condition-description,
.condition-note {
  margin: 0;
  color: rgb(var(--v-theme-textPrimary));
  line-height: 1.6;
  white-space: pre-line;
}
.condition-note {
  margin-top: 16px;
  color: rgb(var(--v-theme-textMuted));
}
.equipment-eyebrow {
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
</style>
