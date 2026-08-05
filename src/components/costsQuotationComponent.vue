<script setup>
import { computed, ref, watch } from 'vue'
import { getQuotationEquipment } from '@/services/quotations'

const props = defineProps({
  quotationId: { type: [Number, String], default: null },
  accessToken: { type: String, default: '' },
})

const loading = ref(false)
const errorMessage = ref('')
const equipment = ref([])
const discountRate = 0.2
const taxRate = 0.16

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
          </v-card-title>

          <v-card-text class="equipment-content">
            <v-row>
              <v-col cols="10">
                <p>{{ truncateText(item.descripcion) }}</p>
              </v-col>
              <v-col cols="2">
                <v-chip color="green" variant="flat">{{ formatCurrency(item.costoactual ?? item.costo) }}</v-chip>
              </v-col>
            </v-row>

          </v-card-text>
        </v-card>
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
@media (max-width: 500px) {
  .equipment-title {
    flex-direction: column;
  }
}
</style>
