<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getChatMemberByCode } from '@/services/chats'
import { getQuotationFiles, getQuotationInfo, getQuotationProducts, uploadFileQuotationProduct } from '@/services/quotations'

const props = defineProps({
  quotationId: { type: [Number, String], default: null },
  accessToken: { type: String, default: '' },
})

const route = useRoute()
const loading = ref(false)
const errorMessage = ref('')
const products = ref([])
const quotationInfo = ref(null)
const prospectInfo = ref(null)
const quotationFiles = ref([])
const productFiles = ref({})
const productUploads = ref({})
const productUploadErrors = ref({})
const productUploadSuccesses = ref({})
const productUploadSuccessTimers = new Map()
const selectedImage = ref('')
const selectedFileIsPdf = ref(false)
const imagePreviewOpen = ref(false)
const defaultProductImage = 'https://camarasal.com/wp-content/uploads/2020/08/default-image-5-1.jpg'
const presentationHeaders = [
  { title: 'Presentación', key: 'presentacion' },
  { title: 'Producción requerida por minuto', key: 'produccion' },
  { title: 'Comentario', key: 'comentario' },
]

const getProductFiles = (product) => productFiles.value[product?.idprod] ?? []
const getQuotationFilesByProduct = (product) => {
  const productId = product?.idprod

  if (productId == null) {
    return []
  }

  return quotationFiles.value.filter((file) => String(file?.fk_idprod) === String(productId))
}
const quotationHeading = () => {
  const quotationNumber = quotationInfo.value?.idcoti ?? props.quotationId
  const company = quotationInfo.value?.empresa ?? prospectInfo.value?.empresa

  return company ? `Cotización #${quotationNumber} - ${company}` : `Cotización #${quotationNumber}`
}
const getQuotationFileUrl = (file) => {
  const fileUrl = file?.url ?? file?.archivo

  if (!fileUrl) {
    return ''
  }

  try {
    return new URL(fileUrl, import.meta.env.VITE_API_BASE_URL).toString()
  } catch {
    return fileUrl
  }
}
const isPdfFile = (file) => {
  const fileName = file?.nombre ?? file?.name ?? file?.archivo ?? file?.url ?? ''
  const fileType = file?.mime_type ?? file?.mimetype ?? file?.tipo ?? file?.type ?? ''

  return String(fileType).toLowerCase() === 'application/pdf' || /\.pdf(?:$|[?#])/i.test(String(fileName))
}
const getOrderedQuotationFilesByProduct = (product) => [...getQuotationFilesByProduct(product)]
  .sort((first, second) => Number(isPdfFile(first)) - Number(isPdfFile(second)))
const isProductUploading = (product) => Boolean(productUploads.value[product?.idprod])
const getProductUploadError = (product) => productUploadErrors.value[product?.idprod] ?? ''
const getProductUploadSuccess = (product) => productUploadSuccesses.value[product?.idprod] ?? ''

const showProductUploadSuccess = (productId, message) => {
  clearTimeout(productUploadSuccessTimers.get(productId))
  productUploadSuccesses.value = { ...productUploadSuccesses.value, [productId]: message }

  productUploadSuccessTimers.set(productId, window.setTimeout(() => {
    const successes = { ...productUploadSuccesses.value }
    delete successes[productId]
    productUploadSuccesses.value = successes
    productUploadSuccessTimers.delete(productId)
  }, 4000))
}

const setProductFiles = (product, files) => {
  if (product?.idprod == null) {
    return
  }

  const normalizedFiles = Array.isArray(files) ? files : files ? [files] : []

  productFiles.value = {
    ...productFiles.value,
    [product.idprod]: normalizedFiles,
  }
}

const openImagePreview = (imageUrl) => {
  selectedImage.value = imageUrl
  selectedFileIsPdf.value = false
  imagePreviewOpen.value = true
}

const openPdfPreview = (fileUrl) => {
  selectedImage.value = fileUrl
  selectedFileIsPdf.value = true
  imagePreviewOpen.value = true
}

const uploadProductFiles = async (product) => {
  const productId = product?.idprod
  const files = getProductFiles(product)
  const accessCode = route.params.access_code

  productUploadErrors.value = { ...productUploadErrors.value, [productId]: '' }
  productUploadSuccesses.value = { ...productUploadSuccesses.value, [productId]: '' }

  if (!files.length) {
    productUploadErrors.value = {
      ...productUploadErrors.value,
      [productId]: 'Selecciona al menos un archivo para subir.',
    }
    return
  }

  if (!props.quotationId || !accessCode) {
    productUploadErrors.value = {
      ...productUploadErrors.value,
      [productId]: 'No fue posible identificar la cotizaciÃ³n o el acceso del usuario.',
    }
    return
  }

  productUploads.value = { ...productUploads.value, [productId]: true }

  try {
    const chatMember = await getChatMemberByCode(accessCode)

    if (chatMember?.user_id == null) {
      throw new Error('No fue posible identificar al usuario que carga los archivos.')
    }

    await Promise.all(files.map((file) => uploadFileQuotationProduct({
      quotation_id: props.quotationId,
      user_id: chatMember.user_id,
      fk_idprod: productId,
      file,
      accessToken: props.accessToken,
    })))

    setProductFiles(product, [])
    await loadQuotationFiles()
    showProductUploadSuccess(
      productId,
      files.length === 1 ? 'Archivo cargado correctamente.' : 'Archivos cargados correctamente.',
    )
  } catch (error) {
    console.log('error', error)
    productUploadErrors.value = {
      ...productUploadErrors.value,
      [productId]: error.response?.data?.message || error.message || error.detail || 'No se pudieron cargar los archivos.',
    }
  } finally {
    productUploads.value = { ...productUploads.value, [productId]: false }
  }
}

const loadQuotationFiles = async () => {
  const accessCode = route.params.access_code

  if (!props.quotationId || !accessCode) {
    quotationFiles.value = []
    return
  }

  try {
    const chatMember = await getChatMemberByCode(accessCode)

    if (chatMember?.user_id == null) {
      quotationFiles.value = []
      return
    }

    const response = await getQuotationFiles(
      props.quotationId,
      chatMember.user_id,
      { accessToken: props.accessToken },
    )

    quotationFiles.value = Array.isArray(response) ? response : []
  } catch {
    quotationFiles.value = []
  }
}

const loadProducts = async () => {
  if (!props.quotationId) {
    products.value = []
    errorMessage.value = 'No fue posible identificar la cotización.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await getQuotationProducts(props.quotationId, {
      accessToken: props.accessToken,
    })

    products.value = Array.isArray(response) ? response : []

    if (!products.value.length) {
      errorMessage.value = 'Esta cotización no tiene productos registrados.'
    }
  } catch (error) {
    products.value = []
    errorMessage.value = error.message || 'No se pudieron obtener los productos de la cotización.'
  } finally {
    loading.value = false
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

watch(() => [props.quotationId, props.accessToken, route.params.access_code], () => {
  loadProducts()
  loadQuotationFiles()
  loadQuotationInfo()
}, { immediate: true })

onBeforeUnmount(() => {
  productUploadSuccessTimers.forEach((timer) => clearTimeout(timer))
})
</script>

<template>
  <section class="products-quotation">
    <div v-if="loading" class="products-state">
      <v-progress-circular color="primary" indeterminate size="32" />
      <span>Cargando productos de la cotización...</span>
    </div>

    <v-alert v-else-if="errorMessage" type="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <template v-else>
      <div>
        <p class="products-eyebrow">{{ quotationHeading() }}</p>
        <h1>Requerimiento de producción</h1>
      </div>

      <div>
        <span>
            A continuación, mostramos los requerimientos que desean cumplan nuestros equipos en relación con el proyecto y capacidad de produccción requerida por
ustedes. La capacidad del producto nominal es estimada, pudiendo variar hasta un 15% con base en cualidades particulares del envase, tapa, etiqueta y/o
producto en su caso.
          </span>
      </div>

      <v-card v-for="product in products" :key="product.idprod" class="product-card" variant="elevated">
        <v-card-title>Producto: {{ product.producto }}</v-card-title>
        <v-card-subtitle v-if="product.descripcion">{{ product.descripcion }}</v-card-subtitle>
        <v-card-text>

          <v-row class="product-card__content">
            <v-col cols="12" md="8">
              <div class="product-presentations">
                <v-data-table
                :headers="presentationHeaders"
                :items="(product.Presentacion ?? []).map((presentation) => ({
                  idpresen: presentation.idpresen,
                  presentacion: `${presentation.presentacion ?? ''} ${presentation.medida ?? ''}`.trim(),
                  produccion: presentation.produccion || 'Sin información',
                  comentario: presentation.comentario || '—',
                }))"
                :items-per-page="-1"
                class="product-presentations__table"
                hide-default-footer
                density="comfortable"
                />
              </div>

              <section class="product-files product-files--desktop">
                <h3>Archivos/Imagenes del producto</h3>
                <div class="product-files__input-row">
                  <v-file-input
                    :model-value="getProductFiles(product)"
                    accept="image/*,application/pdf,.pdf"
                    chips
                    clearable
                    density="compact"
                    hide-details
                    label="Agregar fotos o PDFs"
                    multiple
                    prepend-icon="mdi-paperclip"
                    variant="outlined"
                    @update:model-value="setProductFiles(product, $event)"
                  />
                  <v-btn
                    :disabled="!getProductFiles(product).length"
                    :loading="isProductUploading(product)"
                    color="primary"
                    @click="uploadProductFiles(product)"
                  >
                    Subir
                    <v-icon>mdi-upload</v-icon>
                  </v-btn>
                </div>
                <v-alert v-if="getProductUploadError(product)" density="compact" type="error" variant="tonal">
                  {{ getProductUploadError(product) }}
                </v-alert>
                <v-alert v-else-if="getProductUploadSuccess(product)" density="compact" type="success" variant="tonal">
                  {{ getProductUploadSuccess(product) }}
                </v-alert>
              </section>
            </v-col>
            <v-col cols="12" md="4">
              <div class="product-images">
                <template v-if="getOrderedQuotationFilesByProduct(product).length">
                  <div class="product-images__grid">
                    <template v-for="file in getOrderedQuotationFilesByProduct(product)" :key="file.idarch">
                      <button
                        v-if="isPdfFile(file)"
                        type="button"
                        class="product-file-preview product-file-preview--pdf"
                        :aria-label="`Abrir PDF: ${file.descripcion || 'archivo del producto'}`"
                        @click="openPdfPreview(getQuotationFileUrl(file))"
                      >
                        <v-icon size="40">mdi-file-pdf-box</v-icon>
                        <span>PDF</span>
                      </button>
                      <v-img
                        v-else
                        :src="getQuotationFileUrl(file)"
                        :alt="file.descripcion || 'Archivo del producto'"
                        class="product-image product-image--thumbnail"
                        cover
                        tabindex="0"
                        @click="openImagePreview(getQuotationFileUrl(file))"
                        @keydown.enter="openImagePreview(getQuotationFileUrl(file))"
                      />
                    </template>
                  </div>
                </template>
                <v-img
                  v-else
                  :src="defaultProductImage"
                  alt="Producto"
                  class="product-image"
                  cover
                />
              </div>
            </v-col>
          </v-row>

          <section class="product-files product-files--mobile">
            <h3>Archivos del producto</h3>
            <div class="product-files__input-row">
              <v-file-input
                :model-value="getProductFiles(product)"
                accept="image/*,video/*,application/pdf,.pdf"
                chips
                clearable
                density="compact"
                hide-details
                label="Agregar fotos, videos o PDFs"
                multiple
                prepend-icon="mdi-paperclip"
                variant="outlined"
                @update:model-value="setProductFiles(product, $event)"
              />
              <v-btn
                :disabled="!getProductFiles(product).length"
                :loading="isProductUploading(product)"
                color="primary"
                @click="uploadProductFiles(product)"
              >
                Subir
                <v-icon>mdi-upload</v-icon>
              </v-btn>
            </div>
            <v-alert v-if="getProductUploadError(product)" density="compact" type="error" variant="tonal">
              {{ getProductUploadError(product) }}
            </v-alert>
            <v-alert v-else-if="getProductUploadSuccess(product)" density="compact" type="success" variant="tonal">
              {{ getProductUploadSuccess(product) }}
            </v-alert>
          </section>
          
        </v-card-text>
      </v-card>
    </template>

    <v-dialog v-model="imagePreviewOpen" max-width="900">
      <v-card>
        <v-card-title class="d-flex justify-end">
          <v-btn icon="mdi-close" variant="text" @click="imagePreviewOpen = false" />
        </v-card-title>
        <iframe
          v-if="selectedFileIsPdf"
          :src="selectedImage"
          class="product-pdf--preview"
          title="Vista previa del PDF"
        />
        <v-img v-else :src="selectedImage" alt="Imagen ampliada" class="product-image--preview" contain />
      </v-card>
    </v-dialog>
  </section>
</template>

<style scoped>
.products-quotation {
  display: grid;
  gap: 24px;
}
.products-state {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 240px;
  color: rgb(var(--v-theme-textMuted));
}
.product-card__content {
  align-items: stretch;
}
.product-presentations {
  overflow-x: auto;
}
.product-presentations__table {
  min-width: 560px;
}
.product-presentations__table :deep(.v-table__wrapper) {
  overflow-x: auto;
}
.product-files {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}
.product-files--mobile {
  display: none;
}
.product-files h3 {
  margin: 0;
  color: rgb(var(--v-theme-textPrimary));
  font-size: 1rem;
}
.product-files__input-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.product-files__input-row :deep(.v-input) {
  flex: 1;
}
@media (max-width: 600px) {
  .products-quotation {
    gap: 16px;
  }
  .product-card :deep(.v-card-title) {
    padding-bottom: 4px;
    font-size: 1.15rem;
    white-space: normal;
  }
  .product-card :deep(.v-card-text) {
    padding: 12px;
  }
  .product-card__content {
    margin: -12px;
  }
  .product-presentations__table {
    min-width: 520px;
  }
  .product-files__input-row {
    align-items: stretch;
    flex-direction: column;
  }
  .product-files--desktop {
    display: none;
  }
  .product-files--mobile {
    display: grid;
  }
  .product-files__input-row :deep(.v-btn) {
    width: 100%;
  }
  .product-image {
    min-height: 220px;
  }
}
.products-eyebrow {
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
.product-image {
  width: 100%;
  min-height: 240px;
  height: 100%;
  margin-bottom: 16px;
  border-radius: 8px;
}
.product-images {
  display: grid;
  gap: 12px;
}
.product-images__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 8px;
}
.product-image--thumbnail {
  min-height: 88px;
  height: 88px;
  margin: 0;
  cursor: pointer;
}
.product-file-preview {
  display: grid;
  width: 100%;
  min-height: 88px;
  height: 88px;
  place-content: center;
  gap: 2px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: #e53935;
  cursor: pointer;
  font: inherit;
}
.product-file-preview span {
  color: rgb(var(--v-theme-textPrimary));
  font-size: 0.75rem;
  font-weight: 700;
}
.product-file-preview:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.product-image--preview {
  max-height: 75vh;
  margin: 0;
}
.product-pdf--preview {
  display: block;
  width: 100%;
  height: 75vh;
  border: 0;
}
.product-image--thumbnail:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
</style>
