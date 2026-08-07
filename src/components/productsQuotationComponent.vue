<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { getQuotationProducts } from '@/services/quotations'

const props = defineProps({
  quotationId: { type: [Number, String], default: null },
  accessToken: { type: String, default: '' },
})

const loading = ref(false)
const errorMessage = ref('')
const products = ref([])
const productFiles = ref({})
const productImagePreviews = ref({})
const defaultProductImage = 'https://camarasal.com/wp-content/uploads/2020/08/default-image-5-1.jpg'
const presentationHeaders = [
  { title: 'Presentación', key: 'presentacion' },
  { title: 'Producción por minuto', key: 'produccion' },
  { title: 'Comentario', key: 'comentario' },
]

const getProductFiles = (product) => productFiles.value[product?.idprod] ?? []
const getProductImage = (product) => productImagePreviews.value[product?.idprod] ?? defaultProductImage

const revokeProductPreview = (productId) => {
  const preview = productImagePreviews.value[productId]

  if (preview) {
    URL.revokeObjectURL(preview)
  }
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

  revokeProductPreview(product.idprod)

  const image = normalizedFiles.find((file) => file?.type?.startsWith('image/'))
  const previews = { ...productImagePreviews.value }

  if (image) {
    previews[product.idprod] = URL.createObjectURL(image)
  } else {
    delete previews[product.idprod]
  }

  productImagePreviews.value = previews
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

watch(() => [props.quotationId, props.accessToken], loadProducts, { immediate: true })

onBeforeUnmount(() => {
  Object.values(productImagePreviews.value).forEach((preview) => URL.revokeObjectURL(preview))
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
        <p class="products-eyebrow">Cotización</p>
        <h1>Productos</h1>
      </div>

      <v-card>
        <v-card-text>
          <span>
            A continuación, mostramos requerimientos que desean cumplan nuestros equipos en relación con el proyecto y capacidad de produccción requerida por
ustedes. La capacidad del producto nominal es estimada, pudiendo variar hasta un 15% con base en cualidades particulares del envase, tapa, etiqueta y/o
producto en su caso.
          </span>
        </v-card-text>
      </v-card>

      <v-card v-for="product in products" :key="product.idprod" variant="elevated">
        <v-card-title>{{ product.producto }}</v-card-title>
        <v-card-subtitle v-if="product.descripcion">{{ product.descripcion }}</v-card-subtitle>
        <v-card-text>

          <v-row>
            <v-col cols="8">
              <v-data-table
                :headers="presentationHeaders"
                :items="(product.Presentacion ?? []).map((presentation) => ({
                  idpresen: presentation.idpresen,
                  presentacion: `${presentation.presentacion ?? ''} ${presentation.medida ?? ''}`.trim(),
                  produccion: presentation.produccion || 'Sin información',
                  comentario: presentation.comentario || '—',
                }))"
                :items-per-page="-1"
                hide-default-footer
                density="comfortable"
              />

              <section class="product-files">
                <h3>Archivos del producto</h3>
                <v-file-input
                  :model-value="getProductFiles(product)"
                  accept="image/*,video/*"
                  chips
                  clearable
                  density="compact"
                  hide-details
                  label="Agregar fotos o videos"
                  multiple
                  prepend-icon="mdi-paperclip"
                  variant="outlined"
                  @update:model-value="setProductFiles(product, $event)"
                />
                <v-btn
                  color="primary"
                >
                  Subir archivo
                  <v-icon>mdi-upload</v-icon>
                </v-btn>
              </section>
            </v-col>
            <v-col cols="4">
              <v-img
                :src="getProductImage(product)"
                alt="Producto"
                class="product-image"
                cover
              />
            </v-col>
          </v-row>
          
        </v-card-text>
      </v-card>
    </template>
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
.product-files {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}
.product-files h3 {
  margin: 0;
  color: rgb(var(--v-theme-textPrimary));
  font-size: 1rem;
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
  height: 100%;
  margin-bottom: 16px;
  border-radius: 8px;
}
</style>
