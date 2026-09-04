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
const quotationInfo = ref(null)
const prospectInfo = ref(null)
const term = ref(12)
const downPaymentPercent = ref(15)
const monthlyPayment = ref(0)
const expectedMonthlyProduction = ref(0)
const contributionPerUnit = ref(0)

const currencyCode = computed(() => {
  const currency = String(quotationInfo.value?.moneda_codigo ?? '').trim().toUpperCase()

  return /^[A-Z]{3}$/.test(currency) ? currency : 'MXN'
})

const formatAmount = (value) => new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}).format(Number(value) || 0)

const quotationHeading = () => {
  const quotationNumber = quotationInfo.value?.idcoti ?? props.quotationId
  const company = quotationInfo.value?.empresa ?? prospectInfo.value?.empresa

  return company ? `Cotización #${quotationNumber} - ${company}` : `Cotización #${quotationNumber}`
}

const truncateToTwoDecimals = (value) => Math.trunc(value * 100) / 100

const discountPercentage = computed(() => Number(quotationInfo.value?.descuento) || 0)
const discountAmount = computed(() => truncateToTwoDecimals(projectCost.value * (discountPercentage.value / 100)))
const discountedProjectCost = computed(() => truncateToTwoDecimals(projectCost.value - discountAmount.value))
const traditionalPayment = computed(() => truncateToTwoDecimals(discountedProjectCost.value / 2))
const downPayment = computed(() => truncateToTwoDecimals(projectCost.value * (Number(downPaymentPercent.value) / 100)))
const residualValue = computed(() => truncateToTwoDecimals(projectCost.value * 0.01))
const financedAmount = computed(() => truncateToTwoDecimals(projectCost.value - downPayment.value - residualValue.value))
const monthlyReturnOnInvestment = computed(() => truncateToTwoDecimals(monthlyContribution.value - monthlyPayment.value))
const monthlyContribution = computed(() => truncateToTwoDecimals(
  Number(expectedMonthlyProduction.value || 0) * Number(contributionPerUnit.value || 0)
))
const annualContribution = computed(() => truncateToTwoDecimals(monthlyContribution.value * 12))
const roiPercentage = computed(() => (
  projectCost.value > 0 ? (annualContribution.value / projectCost.value) * 100 : 0
))
const recoveryMonths = computed(() => (
  monthlyContribution.value > 0 ? truncateToTwoDecimals(projectCost.value / monthlyContribution.value) : null
))
const recoveryYears = computed(() => (
  recoveryMonths.value == null ? null : truncateToTwoDecimals(recoveryMonths.value / 12)
))
/*const paymentBalance = computed(
  () => financedAmount.value - Number(monthlyPayment.value || 0) * Number(term.value || 0),
)*/

const recalculateMonthlyPayment = () => {
  const months = Number(term.value)
  monthlyPayment.value = months > 0
    ? truncateToTwoDecimals(financedAmount.value / months)
    : 0
}

const loadCost = async () => {
  if (!props.quotationId) {
    projectCost.value = 0
    quotationInfo.value = null
    prospectInfo.value = null
    errorMessage.value = 'No fue posible identificar la cotización.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await getQuotationInfo(props.quotationId, { accessToken: props.accessToken })
    quotationInfo.value = response?.quotation_info ?? null
    prospectInfo.value = response?.quotation_prospect_info ?? null
    projectCost.value = truncateToTwoDecimals(Number(response?.quotation_info?.costo ?? 0) - Number(response?.quotation_info?.extras ?? 0))

    if (!projectCost.value) {
      errorMessage.value = 'No fue posible obtener el valor del proyecto.'
    }
  } catch (error) {
    projectCost.value = 0
    quotationInfo.value = null
    prospectInfo.value = null
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
        <p class="finance-eyebrow">{{ quotationHeading() }}</p>
        <h1>Análisis Financiero</h1>
      </div>

      <div>
        <span class="finance-plans-note">
            En Equitek contamos con <strong>planes de financiamiento</strong> mediante arrendamiento puro o leasing,
            <strong>te ayudamos</strong> a diseñar un <strong>plan</strong> de acuerdo a tus necesidades, con un
            <strong>enganche mínimo</strong> y distintas <strong>opciones de plazo.</strong>
        </span>
      </div>

      <v-card v-if="discountPercentage > 0" variant="elevated">
        <v-card-text class="promotion">
          <h3>{{ discountPercentage }}% DE DESCUENTO EN PAGOS DE CONTADO ESQUEMA TRADICIONAL</h3>
          <br/>
          <v-container>
            <v-row>
              <v-col cols="3">
                <h4>Valor del proyecto</h4>
              </v-col>
              <v-col cols="3">
                <h4>{{ discountPercentage }}% descuento</h4>
              </v-col>
              <v-col cols="3">
                <h4>50% anticipo</h4>
              </v-col>
              <v-col cols="3">
                <h4>50% contra aviso de embarque</h4>
              </v-col>
              <v-divider></v-divider>
              <v-col cols="3">
                <span>${{ formatAmount(projectCost) }} {{ currencyCode }}</span>
              </v-col>
              <v-col cols="3">
                <span>-${{ formatAmount(discountAmount) }} {{ currencyCode }}</span>
              </v-col>
              <v-col cols="3">
                <span>${{ formatAmount(traditionalPayment) }} {{ currencyCode }}</span>
              </v-col>
              <v-col cols="3">
                <span>${{ formatAmount(traditionalPayment) }} {{ currencyCode }}</span>
              </v-col>
            </v-row>
          </v-container>
          <p class="finance-note">Montos expresados antes de IVA.</p>
        </v-card-text>
      </v-card>

      <v-card variant="elevated">
        <v-card-text class="finance-content">
          <div class="finance-heading">
            <h2>OPCIÓN DE ARRENDAMIENTO FINANCIERO</h2>
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
              :model-value="formatAmount(monthlyPayment)"
              label="Mensualidad"
              min="0"
              prefix="$"
              readonly
              type="text"
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
                {{ Number(downPaymentPercent) || 0 }}% · ${{ formatAmount(downPayment) }} {{ currencyCode }}
              </v-col>
              <v-col cols="3">
                ${{ formatAmount(monthlyPayment) }} {{ currencyCode }}
              </v-col>
              <v-col cols="3">
                ${{ formatAmount(residualValue) }} {{ currencyCode }}
              </v-col>
            </v-row>
          </v-container>

          <p class="finance-note"><strong>Montos expresados antes de IVA.</strong></p>
          <p class="finance-disclaimer">
            Este cálculo es demostrativo y aproximado. Si desea aplicar a alguno de los tipos de
            financiamiento, comuníquelo a su asesor comercial.
          </p>
          <br/>
        </v-card-text>
      </v-card>

      <v-card variant="elevated">
        <v-card-text class="finance-content">
          <div class="finance-heading">
            <h2>ANÁLISIS RETORNO DE INVERSIÓN (ROI)</h2>
            <p>Captura las estimaciones mensuales para conocer la recuperación de tu inversión.</p>
          </div>

          <div class="finance-controls finance-controls--roi">
            <v-text-field
              v-model.number="expectedMonthlyProduction"
              label="Producción mensual esperada"
              min="0"
              suffix="unidades"
              type="number"
              variant="outlined"
            />
            <v-text-field
              v-model.number="contributionPerUnit"
              hint="Cantidad que se dispone del precio total por unidad del producto para pago de inversión"
              label="Margen de contribucion / Aportacion por unidad de producto"
              min="0"
              persistent-hint
              prefix="$"
              :suffix="currencyCode"
              type="number"
              variant="outlined"
            />
          </div>


            <v-row>
              <v-col cols="4">
                <div>
                  <h3>Inversión total: <strong>${{ formatAmount(projectCost) }} {{ currencyCode }}</strong></h3>
                </div>
              </v-col>
              <v-col cols="4">
                <div>
                  <h3>ROI anual estimado: <strong>{{ roiPercentage.toFixed(2) }}%</strong></h3>
                </div>
              </v-col>
              <v-col cols="4">
                <div>
                  <h3>Recuperación estimada: <strong>{{ recoveryMonths == null ? '' : `${recoveryMonths.toFixed(1)} meses` }} / {{ recoveryYears == null ? '' : `${recoveryYears.toFixed(2)} años` }}</strong></h3>
                </div>
              </v-col>
              <v-col cols="6">
                <div>
                  <h3>Margen de contribución mensual: <strong>${{ formatAmount(monthlyContribution) }} {{ currencyCode }}</strong></h3>
                </div>
              </v-col>
              <v-col cols="6">
                <div>
                  <h3>Margen de contribución anual: <strong>${{ formatAmount(annualContribution) }} {{ currencyCode }}</strong></h3>
                </div>
              </v-col>
              <v-col></v-col>
              <v-divider></v-divider>
              <v-col cols="12">
                <div>
                  <h3>
                    Contribución mensual contra arrendamiento mensual:
                    <strong
                      :class="{
                        'monthly-roi-negative': monthlyReturnOnInvestment < 0,
                        'monthly-roi-positive': monthlyReturnOnInvestment > 0,
                      }"
                    >
                      ${{ formatAmount(monthlyReturnOnInvestment) }} {{ currencyCode }}
                    </strong>
                  </h3>
                </div>
              </v-col>
            </v-row>
            <!--<div>
              <span>Recuperación del 100% de la inversión</span>
              <strong>{{ recoveryYears == null ? 'Captura la producción y la aportación por unidad' : `${recoveryYears.toFixed(2)} años` }}</strong>
            </div>-->

        </v-card-text>
      </v-card>
      <br/>
    </template>
  </section>
</template>

<style scoped>
.finance-quotation,
.finance-content { display: grid; gap: 24px; }
.finance-state { display: grid; place-items: center; gap: 12px; min-height: 240px; color: rgb(var(--v-theme-textMuted)); }
.finance-eyebrow { margin: 0; color: rgb(var(--v-theme-primary)); font-size: .84rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
h1 { margin: 8px 0 0; color: rgb(var(--v-theme-textPrimary)); font-size: clamp(1.6rem, 4vw, 2.3rem); line-height: 1.2; }
.finance-plans-card { overflow: hidden; }
.finance-plans-content { padding: 2px 12px 12px; }
.finance-plans-title { padding: 10px 12px; border-radius: 4px; background: rgb(var(--v-theme-primary)); color: white; font-size: clamp(1rem, 2.2vw, 1.3rem); font-weight: 800; line-height: 1.2; text-align: center; }
.finance-benefits { display: grid; grid-template-columns: 1.25fr 1fr .8fr; gap: 16px; max-width: 940px; margin: 12px auto 0; }
.finance-benefits-column { display: grid; align-content: start; gap: 6px; }
.finance-benefits p { display: flex; align-items: center; gap: 8px; margin: 0; color: rgb(var(--v-theme-textPrimary)); font-size: .95rem; }
.equipment-image { max-width: 1040px; margin: 24px auto 16px; }
.finance-plans-note { margin: 0; color: rgb(var(--v-theme-textPrimary)); font-size: .9rem; line-height: 1.6; }
.finance-plans-note span { white-space: nowrap; }
.promotion, .finance-heading { text-align: center; }
.promotion h2, .promotion h3, .finance-heading h2 { margin: 0; color: rgb(var(--v-theme-primary)); font-size: 1.15rem; }
.promotion > p, .finance-heading p { margin: 8px 0 20px; color: rgb(var(--v-theme-textMuted)); }
.finance-controls { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.finance-controls--roi { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.roi-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.roi-summary > div { display: grid; gap: 4px; padding: 14px; border-radius: 8px; background: rgb(var(--v-theme-surfaceVariant)); }
.roi-summary span { color: rgb(var(--v-theme-textMuted)); font-size: .85rem; }
.roi-summary strong { color: rgb(var(--v-theme-textPrimary)); font-size: 1.05rem; }
.monthly-roi-negative { color: rgb(var(--v-theme-error)); }
.monthly-roi-positive { color: rgb(var(--v-theme-success)); }
.finance-note, .finance-disclaimer { margin: 10px 0 0; text-align: center; color: rgb(var(--v-theme-textMuted)); font-size: .9rem; }
.finance-disclaimer { line-height: 1.5; }
.finance-table { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.finance-table :deep(table) { min-width: 640px; }
.finance-table :deep(th) { color: rgb(var(--v-theme-textPrimary)); font-weight: 700; white-space: normal; }
@media (max-width: 700px) {
  .finance-content { gap: 20px; }
  .finance-controls { grid-template-columns: 1fr; gap: 4px; }
  .finance-controls--roi { grid-template-columns: 1fr; }
  .finance-benefits { grid-template-columns: 1fr; gap: 8px; }
  .equipment-image { margin: 20px auto 14px; }
  .finance-plans-note { font-size: .84rem; }
  .finance-plans-note span { white-space: normal; }
  .promotion h3, .finance-heading h2 { font-size: 1rem; line-height: 1.4; }
  .promotion > p, .finance-heading p { margin-bottom: 16px; font-size: .9rem; }
  .finance-note, .finance-disclaimer { font-size: .84rem; }
}
</style>
