<script setup>
import { ref } from 'vue'
import logoUrl from '@/assets/Equitek_Logo.webp'
import isoLogoUrl from '@/assets/logo-iso.png'
import conditionsQuotationComponent from '@/components/conditionsQuotationComponent.vue'
import equipmentQuotationComponent from '@/components/equipmentQuotationComponent.vue'
import financeQuotation from '@/components/financeQuotation.vue'
import infoQuotationComponent from '@/components/infoQuotationComponent.vue'
import linksQuotationComponent from '@/components/linksQuotationComponent.vue'
import productsQuotationComponent from '@/components/productsQuotationComponent.vue'
import scopesQuotationComponent from '@/components/scopesQuotationComponent.vue'
import costsQuotationComponent from '@/components/costsQuotationComponent.vue'
import { createQuotationEvent } from '@/services/quotation_events'

const props = defineProps({
  loading: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
  chatTitle: { type: String, default: 'Chat' },
  contactName: { type: String, default: 'Contacto' },
  contactId: { type: [Number, String], default: null },
  quotationId: { type: [Number, String], default: null },
  accessToken: { type: String, default: '' },
})

const activeTab = ref('inicio')
const mobileTabsMenu = ref(false)

const sectionKeys = {
  inicio: 'home',
  productos: 'products',
  equipos: 'equipment',
  precios: 'prices',
  alcances: 'scopes',
  condiciones: 'conditions',
  financiero: 'financial',
  ligas: 'links',
}

const registerSectionOpen = (tab) => {
  const sectionKey = sectionKeys[tab]

  if (!props.quotationId || !props.contactId || !sectionKey) {
    return
  }

  createQuotationEvent({
    quotation_id: props.quotationId,
    contact_id: props.contactId,
    event_name: 'section_opened',
    section_key: sectionKey,
    element_key: '',
    accessToken: props.accessToken,
  }).catch((error) => {
    console.error(`No se pudo registrar la apertura de ${sectionKey}:`, error)
  })
}

const selectTab = (tab) => {
  activeTab.value = tab
  mobileTabsMenu.value = false
  registerSectionOpen(tab)
}
</script>

<template>
  <div class="client-quotation-page">
    <header class="client-quotation-header">
      <div class="header-brand">
        <img alt="Equitek" class="brand-logo" :src="logoUrl" />
      </div>

      <v-tabs
        v-model="activeTab"
        class="quotation-tabs"
        color="white"
        density="comfortable"
        show-arrows
      >
        <v-tab value="inicio" @click="registerSectionOpen('inicio')">
          <v-icon class="tab-icon" icon="mdi-home"></v-icon>
          <span class="tab-label">Inicio</span>
        </v-tab>
        <v-tab value="productos" @click="registerSectionOpen('productos')">
          <v-icon class="tab-icon" icon="mdi-file-check"></v-icon>
          <span class="tab-label">Requerimientos / Alcances del Proyecto</span>
        </v-tab>
        <v-tab value="equipos" @click="registerSectionOpen('equipos')">
          <v-icon class="tab-icon" icon="mdi-laptop"></v-icon>
          <span class="tab-label">Equipos</span>
        </v-tab>
        <v-tab value="precios" @click="registerSectionOpen('precios')">
          <v-icon class="tab-icon" icon="mdi-tag"></v-icon>
          <span class="tab-label">Precios, Condiciones y Garantias</span>
        </v-tab>
        <!--<v-tab value="alcances">
          <v-icon class="tab-icon" icon="mdi-target"></v-icon>
          Alcances
        </v-tab>
        <v-tab value="condiciones">
          <v-icon class="tab-icon" icon="mdi-file-document-check"></v-icon>
          Condiciones
        </v-tab>-->
        <v-tab value="financiero" @click="registerSectionOpen('financiero')">
          <v-icon class="tab-icon" icon="mdi-cash"></v-icon>
          <span class="tab-label">Analisis Financiero</span>
        </v-tab>
        <v-tab value="ligas" @click="registerSectionOpen('ligas')">
          <v-icon class="tab-icon" icon="mdi-link"></v-icon>
          <span class="tab-label">Ligas</span>
        </v-tab>
      </v-tabs>

      <div class="mobile-tabs-menu">
        <v-menu v-model="mobileTabsMenu" location="bottom end">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              aria-label="Abrir secciones de la cotizaciÃ³n"
              color="secondary"
              icon="mdi-menu"
              variant="text"
            />
          </template>

          <v-list density="compact" min-width="190" nav>
            <v-list-item
              prepend-icon="mdi-home"
              title="Inicio"
              @click="selectTab('inicio')"
            />
            <v-list-item
              prepend-icon="mdi-file-check"
              title="Requerimientos / Alcances del Proyecto"
              @click="selectTab('productos')"
            />
            <v-list-item
              prepend-icon="mdi-laptop"
              title="Equipos"
              @click="selectTab('equipos')"
            />
            <v-list-item
              prepend-icon="mdi-tag"
              title="Precios, Condiciones y Garantias"
              @click="selectTab('precios')"
            />
            <!--<v-list-item
              prepend-icon="mdi-target"
              title="Alcances"
              @click="selectTab('alcances')"
            />
            <v-list-item
              prepend-icon="mdi-file-document-check"
              title="Condiciones"
              @click="selectTab('condiciones')"
            />-->
            <v-list-item
              prepend-icon="mdi-cash"
              title="Analisis Financiero"
              @click="selectTab('financiero')"
            />
            <v-list-item
              prepend-icon="mdi-link"
              title="Ligas"
              @click="selectTab('ligas')"
            />
          </v-list>
        </v-menu>
      </div>
    </header>

    <div class="client-portal-content">
      <v-alert v-if="errorMessage" class="portal-error" type="error" variant="tonal">
        {{ errorMessage }}
      </v-alert>

      <info-quotation-component
        v-else-if="activeTab === 'inicio'"
        :access-token="accessToken"
        :quotation-id=quotationId
      />

      <conditions-quotation-component
        v-else-if="activeTab === 'condiciones'"
        :access-token="accessToken"
        :quotation-id=quotationId
      />

      <equipment-quotation-component
        v-else-if="activeTab === 'equipos'"
        :access-token="accessToken"
        :quotation-id=quotationId
      />

      <products-quotation-component
        v-else-if="activeTab === 'productos'"
        :access-token="accessToken"
        :quotation-id=quotationId
      />

      <costs-quotation-component
        v-else-if="activeTab === 'precios'"
        :access-token="accessToken"
        :quotation-id=quotationId
      />

      <scopes-quotation-component
        v-else-if="activeTab === 'alcances'"
        :access-token="accessToken"
        :quotation-id="quotationId"
      />

      <finance-quotation
        v-else-if="activeTab === 'financiero'"
        :access-token="accessToken"
        :quotation-id="quotationId"
      />

      <links-quotation-component v-else-if="activeTab === 'ligas'" />

      <section v-else class="client-information">
        <span class="information-label">{{ activeTab }}</span>
        <strong>Información disponible próximamente.</strong>
      </section>

      <section v-if="loading && activeTab !== 'inicio'" class="client-information">
        <span class="information-label">Contacto</span>
        <strong>{{ contactName }}</strong>
      </section>
    </div>

    <br/><br/>

    <footer class="quotation-footer">
      <!--<section class="iso-banner">
        <div>
          <p class="iso-eyebrow">Comprometidos con la Calidad:</p>
          <h3>Certificación ISO 9001:2015</h3>
          <p class="iso-description">
            Nuestra certificación ISO 9001:2015 garantiza que todos nuestros procesos cumplen con los más altos estándares internacionales, asegurando equipos confiables, eficientes y diseñados para superar tus expectativas.
          </p>
        </div>
        <img :src="isoLogoUrl" alt="Certificación ISO 9001:2015" class="iso-logo" />
      </section>-->

      <section class="footer-main">
        <div class="footer-content">
          <div class="footer-company">
            <img :src="logoUrl" alt="Equitek" class="footer-logo" />
            <a href="tel:+528183900932" target="_blank" rel="noopener noreferrer"><v-icon icon="mdi-phone" /> +52 (81) 8390-0932</a>
            <a href="mailto:ventas@equitek.com.mx" target="_blank" rel="noopener noreferrer"><v-icon icon="mdi-email" /> ventas@equitek.com.mx</a>
            <p><v-icon icon="mdi-map-marker" /> Volcán Barcena #150 Parque Industrial IBP 100, C.P. 66368 Santa Catarina, N.L. México.</p>
          </div>
          <div class="footer-links">
            <div>
              <h3>Maquinaria</h3>
              <a href="https://equitek.com.mx/maquinas-envasadoras/" target="_blank" rel="noopener noreferrer">Envasado</a>
              <a href="https://equitek.com.mx/maquinas-tapadoras/" target="_blank" rel="noopener noreferrer">Tapado</a>
              <a href="https://equitek.com.mx/maquinas-etiquetadoras/" target="_blank" rel="noopener noreferrer">Etiquetado</a>
              <a href="https://equitek.com.mx/maquinas-enjuagadoras/" target="_blank" rel="noopener noreferrer">Enjuagadoras</a>
              <a href="https://equitek.com.mx/accesorios/" target="_blank" rel="noopener noreferrer">Accesorios</a>
            </div>
            <div>
              <h3>Nosotros</h3>
              <a href="https://equitek.com.mx/nosotros/" target="_blank" rel="noopener noreferrer">Historia</a>
              <a href="https://equitek.com.mx/nosotros/" target="_blank" rel="noopener noreferrer">Misión y visión</a>
              <a href="https://equitek.com.mx/nosotros/" target="_blank" rel="noopener noreferrer">Tec. Global</a>
              <a href="https://equitek.com.mx/nosotros/" target="_blank" rel="noopener noreferrer">Presencia</a>
              <a href="https://equitek.com.mx/aviso-de-privacidad/" target="_blank" rel="noopener noreferrer">Aviso de privacidad</a>
            </div>
            <div>
              <h3>Soporte</h3>
              <a href="https://equitek.com.mx/soporte/servicio/" target="_blank" rel="noopener noreferrer">Refacciones</a>
              <a href="https://equitek.com.mx/soporte/servicio/" target="_blank" rel="noopener noreferrer">Mantenimientos</a>
              <a href="https://equitek.com.mx/soporte/servicio/" target="_blank" rel="noopener noreferrer">Garantía extendida</a>
              <a href="https://equitek.com.mx/soporte/servicio/" target="_blank" rel="noopener noreferrer">4.0 Industria</a>
              <a href="https://equitek.com.mx/soporte/servicio/" target="_blank" rel="noopener noreferrer">Servicio al cliente</a>
            </div>
          </div>
          <div class="footer-newsletter">
            <h3>Suscríbete newsletter</h3>
            <input aria-label="Nombre" placeholder="Nombre" type="text" />
            <input aria-label="Correo electrónico" placeholder="Email" type="email" />
            <button type="button">Suscríbete</button>
          </div>
        </div>
        <section class="iso-banner">
          <div>
            <p class="iso-eyebrow">Comprometidos con la Calidad:</p>
            <h3>Certificación ISO 9001:2015</h3>
            <p class="iso-description">
              Nuestra certificación ISO 9001:2015 garantiza que todos nuestros procesos cumplen con los más altos estándares internacionales, asegurando equipos confiables, eficientes y diseñados para superar tus expectativas.
            </p>
          </div>
          <img :src="isoLogoUrl" alt="Certificación ISO 9001:2015" class="iso-logo" />
        </section>
        <div class="footer-bottom">
          <span>©2026 EQUITEK S.A. de C.V. Todos los Derechos Reservados</span>
          <!--<img :src="isoLogoUrl" alt="ISO 9001:2015" />-->
        </div>
      </section>
    </footer>
  </div>
</template>

<style scoped>
.client-quotation-page {
  margin: -24px -24px 0;
}

.client-quotation-page a {
  color: #fff;
  text-decoration: none;
}

.client-quotation-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgb(var(--v-theme-border));
  background: rgb(var(--v-theme-primary));
}

.header-brand {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 24px;
  color: rgb(var(--v-theme-surface));
  font-size: 1.2rem;
  font-weight: 700;
}

.brand-logo {
  width: 220px;
  height: 220px;
  margin-block: -40px;
  object-fit: contain;
}

.quotation-tabs {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 68px;
}

.mobile-tabs-menu {
  display: none;
}

.quotation-tabs :deep(.v-tab) {
  min-height: 64px;
  color: rgb(var(--v-theme-surface)) !important;
}

.quotation-tabs :deep(.v-btn__content) {
  white-space: normal;
}

.quotation-tabs :deep(.tab-icon) {
  color: rgb(var(--v-theme-secondary)) !important;
}

.quotation-tabs :deep(.v-slide-group__prev .v-icon),
.quotation-tabs :deep(.v-slide-group__next .v-icon) {
  color: #d1d5db;
}

.quotation-tabs :deep(.v-slide-group__content) {
  justify-content: center;
}

.tab-icon {
  flex: 0 0 auto;
  margin-right: 8px;
}

.tab-label {
  display: block;
  max-width: 150px;
  line-height: 1.2;
  text-align: center;
}

.client-portal-content {
  width: min(100%, 1024px);
  margin: 0 auto;
  padding: 64px 0px 0px;
}

.quotation-footer {
  margin-top: 64px;
}

.iso-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  width: min(100%, 920px);
  margin: 0 auto;
  padding: 32px 24px;
  color: #243957;
}

.iso-eyebrow,
.iso-banner h2,
.iso-description {
  margin: 0;
}

.iso-eyebrow {
  font-size: 0.78rem;
  color:#fff
}

.iso-banner h2 {
  margin-top: 6px;
  font-size: clamp(1.15rem, 2vw, 1.6rem);
}

.iso-description {
  max-width: 540px;
  margin-top: 8px;
  font-size: 0.74rem;
  line-height: 1.4;
  color: #fff
}

.iso-logo {
  width: min(70px, 20vw);
  height: auto;
  filter: grayscale(1) brightness(0) invert(1);
}

.footer-main {
  background: #1f283d;
  color: #fff;
}

.footer-content,
.footer-bottom {
  width: min(100%, 1080px);
  margin: 0 auto;
  padding-inline: 24px;
}

.footer-content {
  display: grid;
  grid-template-columns: 1.35fr 2fr 1.1fr;
  gap: 24px;
  padding-top: 30px;
  padding-bottom: 28px;
}

.footer-company,
.footer-links > div,
.footer-newsletter {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.footer-logo {
  width: 220px;
  height: 58px;
  margin-bottom: 4px;
  object-position: left center;
}

.footer-company a,
.footer-company p,
.footer-links a {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  color: inherit;
  font-size: .78rem;
  line-height: 1.35;
  text-decoration: none;
}

.footer-company .v-icon {
  flex: 0 0 auto;
  color: #ff3945;
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.footer-main h3 {
  margin: 0 0 2px;
  color: #ff3945;
  font-size: .74rem;
  text-transform: uppercase;
}

.footer-newsletter input,
.footer-newsletter button {
  width: 100%;
  min-height: 30px;
  border: 0;
  padding: 6px 8px;
  font: inherit;
  font-size: .7rem;
}

.footer-newsletter input {
  background: #343d52;
  color: #fff;
}

.footer-newsletter button {
  background: #ff3945;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
}

.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-top: 1px solid rgba(255, 255, 255, .1);
  padding-top: 10px;
  padding-bottom: 10px;
  font-size: .62rem;
}

.footer-bottom img {
  width: 34px;
  height: 34px;
  object-fit: contain;
  filter: grayscale(1) brightness(0) invert(1);
}

.portal-eyebrow,
.information-label {
  margin: 0;
  color: rgb(var(--v-theme-primary));
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.client-portal-content h1 {
  margin: 8px 0 0;
  color: rgb(var(--v-theme-textPrimary));
  font-size: clamp(1.6rem, 4vw, 2.3rem);
  line-height: 1.2;
}

.portal-description {
  max-width: 620px;
  margin: 12px 0 0;
  color: rgb(var(--v-theme-textMuted));
}

.portal-error,
.client-information {
  max-width: 620px;
  margin-top: 28px;
}

.client-information {
  display: grid;
  gap: 6px;
  padding: 20px;
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-textPrimary));
}

@media (max-width: 700px) {
  .client-quotation-page {
    margin: -16px -16px 0;
  }

  .header-brand {
    padding: 0 16px;
  }

  .quotation-tabs {
    display: none;
  }

  .mobile-tabs-menu {
    display: block;
    margin-left: auto;
    margin-right: 12px;
  }

  .quotation-tabs :deep(.v-slide-group__content) {
    padding: 0 8px;
  }

  .quotation-footer {
    margin-top: 40px;
  }

  .iso-banner {
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
    padding-block: 24px;
  }

  .iso-logo {
    align-self: center;
    width: 110px;
  }

  .footer-content {
    grid-template-columns: 1fr;
    gap: 24px;
    padding-top: 28px;
  }

  .footer-links {
    grid-template-columns: repeat(2, 1fr);
  }

  .footer-bottom {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
