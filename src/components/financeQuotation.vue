<script setup>
import { computed, ref, watch } from 'vue'
import { getQuotationInfo } from '@/services/quotations'

const props = defineProps({
  quotationId: { type: [Number, String], default: null },
  accessToken: { type: String, default: '' },
})

const loading = ref(false)
const errorMessage = ref('')
const projectCost = ref(0)
const term = ref(12)
const downPaymentPercent = ref(15)
const monthlyPayment = ref(0)

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value) || 0)

const discountedCost = computed(() => projectCost.value * 0.88)
const traditionalPayment = computed(() => discountedCost.value / 2)
const downPayment = computed(() => projectCost.value * (Number(downPaymentPercent.value) / 100))
const residualValue = computed(() => projectCost.value * 0.01)
const financedAmount = computed(() => projectCost.value - downPayment.value - residualValue.value)
/*const paymentBalance = computed(
  () => financedAmount.value - Number(monthlyPayment.value || 0) * Number(term.value || 0),
)*/

const recalculateMonthlyPayment = () => {
  const months = Number(term.value)
  monthlyPayment.value = months > 0 ? financedAmount.value / months : 0
}

const loadCost = async () => {
  if (!props.quotationId) {
    projectCost.value = 0
    errorMessage.value = 'No fue posible identificar la cotización.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await getQuotationInfo(props.quotationId, { accessToken: props.accessToken })
    projectCost.value = Number(response?.quotation_info?.costo ?? 0)

    if (!projectCost.value) {
      errorMessage.value = 'No fue posible obtener el valor del proyecto.'
    }
  } catch (error) {
    projectCost.value = 0
    errorMessage.value = error.message || 'No se pudo obtener el valor del proyecto.'
  } finally {
    loading.value = false
  }
}

watch(() => [props.quotationId, props.accessToken], loadCost, { immediate: true })
watch([projectCost, term, downPaymentPercent], recalculateMonthlyPayment)
</script>

<template>
  <section class="finance-quotation">
    <div v-if="loading" class="finance-state">
      <v-progress-circular color="primary" indeterminate size="32" />
      <span>Cargando información financiera...</span>
    </div>

    <v-alert v-else-if="errorMessage" type="error" variant="tonal">{{ errorMessage }}</v-alert>

    <template v-else>
      <div>
        <p class="finance-eyebrow">Cotización</p>
        <h1>Análisis Financiero</h1>
      </div>

      <v-card variant="elevated">
        <v-card-text class="promotion">
          <h3>12% DE DESCUENTO EN PAGOS DE CONTADO ESQUEMA TRADICIONAL</h3>
          <br/>
          <v-container>
            <v-row>
              <v-col cols="3">
                <h4>Valor del proyecto</h4>
              </v-col>
              <v-col cols="3">
                <h4>12% descuento</h4>
              </v-col>
              <v-col cols="3">
                <h4>50% anticipo</h4>
              </v-col>
              <v-col cols="3">
                <h4>50% contra aviso de embarque</h4>
              </v-col>
              <v-divider></v-divider>
              <v-col cols="3">
                <span>{{ formatCurrency(projectCost) }}</span>
              </v-col>
              <v-col cols="3">
                <span>{{ formatCurrency(discountedCost) }}</span>
              </v-col>
              <v-col cols="3">
                <span>{{ formatCurrency(traditionalPayment) }}</span>
              </v-col>
              <v-col cols="3">
                <span>{{ formatCurrency(traditionalPayment) }}</span>
              </v-col>
            </v-row>
          </v-container>
          <p class="finance-note">Montos expresados antes de IVA.</p>
        </v-card-text>
      </v-card>

      <v-card variant="elevated">
        <v-card-text class="finance-content">
          <div class="finance-heading">
            <h2>ARRENDAMIENTO FINANCIERO</h2>
            <p>Hasta 24 meses sin intereses</p>
          </div>

          <div class="finance-controls">
            <v-select
              v-model="term"
              :items="[12, 18, 24]"
              label="Plazo (meses)"
              variant="outlined"
            />
            <v-text-field
              v-model.number="downPaymentPercent"
              label="Anticipo (%)"
              max="99"
              min="0"
              suffix="%"
              type="number"
              variant="outlined"
            />
            <v-text-field
              v-model.number="monthlyPayment"
              label="Mensualidad"
              min="0"
              prefix="$"
              type="number"
              variant="outlined"
            />
          </div>

          <v-container>
            <v-row>
              <v-col cols="3">
                <h4>Plazo</h4>
              </v-col>
              <v-col cols="3">
                <h4>Anticipo</h4>
              </v-col>
              <v-col cols="3">
                <h4>Mensualidad</h4>
              </v-col>
              <v-col cols="3">
                <h4>Valor residual (1%)</h4>
              </v-col>
              <v-divider></v-divider>
              <v-col cols="3">
                {{ term }} meses
              </v-col>
              <v-col cols="3">
                {{ Number(downPaymentPercent) || 0 }}% · {{ formatCurrency(downPayment) }}
              </v-col>
              <v-col cols="3">
                {{ formatCurrency(monthlyPayment) }}
              </v-col>
              <v-col cols="3">
                {{ formatCurrency(residualValue) }}
              </v-col>
            </v-row>
          </v-container>

          <p class="finance-note">Montos expresados antes de IVA.</p>
          <p class="finance-disclaimer">
            Este cálculo es demostrativo y aproximado. Si desea aplicar a alguno de los tipos de
            financiamiento, comuníquelo a su asesor comercial.
          </p>
          <br/>
        </v-card-text>
      </v-card>
    </template>
  </section>
</template>

<style scoped>
.finance-quotation,
.finance-content { display: grid; gap: 24px; }
.finance-state { display: grid; place-items: center; gap: 12px; min-height: 240px; color: rgb(var(--v-theme-textMuted)); }
.finance-eyebrow { margin: 0; color: rgb(var(--v-theme-primary)); font-size: .84rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
h1 { margin: 8px 0 0; color: rgb(var(--v-theme-textPrimary)); font-size: clamp(1.6rem, 4vw, 2.3rem); line-height: 1.2; }
.promotion, .finance-heading { text-align: center; }
.promotion h2, .promotion h3, .finance-heading h2 { margin: 0; color: rgb(var(--v-theme-primary)); font-size: 1.15rem; }
.promotion > p, .finance-heading p { margin: 8px 0 20px; color: rgb(var(--v-theme-textMuted)); }
.finance-controls { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.finance-note, .finance-disclaimer { margin: 10px 0 0; text-align: center; color: rgb(var(--v-theme-textMuted)); font-size: .9rem; }
.finance-disclaimer { line-height: 1.5; }
.finance-table { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.finance-table :deep(table) { min-width: 640px; }
.finance-table :deep(th) { color: rgb(var(--v-theme-textPrimary)); font-weight: 700; white-space: normal; }
@media (max-width: 700px) {
  .finance-content { gap: 20px; }
  .finance-controls { grid-template-columns: 1fr; gap: 4px; }
  .promotion h3, .finance-heading h2 { font-size: 1rem; line-height: 1.4; }
  .promotion > p, .finance-heading p { margin-bottom: 16px; font-size: .9rem; }
  .finance-note, .finance-disclaimer { font-size: .84rem; }
}
</style>
