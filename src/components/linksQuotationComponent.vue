<script setup>
import equitekPersonalImage from '@/assets/equitek-nosotros.webp'

const socialLinks = [
  /*{
    name: 'WhatsApp',
    icon: 'mdi-whatsapp',
    url: 'https://api.whatsapp.com/send?phone=528115012414&text=Hola%2C%20me%20gustar%C3%ADa%20informaci%C3%B3n%20sobre%20los%20equipos%21',
  },*/
  {
    name: 'YouTube',
    icon: 'mdi-youtube',
    url: 'https://www.youtube.com/channel/UCmOYDTOXXodUXtkx7ao0fPQ?sub_confirmation=1',
  },
  {
    name: 'Facebook',
    icon: 'mdi-facebook',
    url: 'https://es-la.facebook.com/equitek.packing/',
  },
  {
    name: 'Instagram',
    icon: 'mdi-instagram',
    url: 'https://www.instagram.com/equitek.packing/',
  },
  {
    name: 'TikTok',
    icon: 'mdi-music-note-eighth',
    url: 'https://www.tiktok.com/@equitek.packing',
  },
  {
    name: 'LinkedIn',
    icon: 'mdi-linkedin',
    url: 'https://mx.linkedin.com/company/equitek',
  },
]

const videos = [
  {
    title: 'Caso de Éxito: Envasadora de Aceites y Lubricantes Automotrices',
    id: 'LUyE7RXxZ9o',
  },
  {
    title: 'Sistema de Envasado por Nivel Automático: Precisión y Eficiencia para Líneas de Producción',
    id: '_24KuV1jQpI?si=4Y3iVLCr8sDAmcvS'
  }
]
</script>

<template>
  <section class="quotation-links">
    <div>
      <section
        class="links-hero"
        :style="{ backgroundImage: `linear-gradient(90deg, rgb(0 0 0 / 76%), rgb(0 0 0 / 28%)), url(${equitekPersonalImage})` }"
      >
        <div class="links-hero-content">
          <h1>Soluciones de envasado, tapado y etiquetado.</h1>
          <p>
            Desde 1986 Equitek es líder en LATAM en la manufactura de maquinaria de Envasado,
            Tapado y Etiquetado. Transformamos tus procesos de empaque con soluciones a medida,
            eficientes que te ayudan a reducir tus costos.
          </p>
        </div>
      </section>
    </div>

    <h1>Redes sociales</h1>
    <div class="social-links">
      <v-btn
        v-for="socialLink in socialLinks"
        :key="socialLink.name"
        :href="socialLink.url"
        :prepend-icon="socialLink.icon"
        rel="noopener"
        target="_blank"
        variant="outlined"
      >
        {{ socialLink.name }}
      </v-btn>
    </div>

    <br/>

    <h1>Testimoniales</h1>
    <div class="videos-grid">
      <v-card v-for="video in videos" :key="video.id" variant="outlined">
        <v-card-title>{{ video.title }}</v-card-title>
        <div class="video-container">
          <iframe
            allow="
              accelerometer;
              autoplay;
              clipboard-write;
              encrypted-media;
              gyroscope;
              picture-in-picture;
              web-share;
            "
            allowfullscreen
            :src="`https://www.youtube-nocookie.com/embed/${video.id}`"
            :title="video.title"
          />
        </div>
      </v-card>
    </div>
  </section>
</template>

<style scoped>
.quotation-links {
  display: grid;
  gap: 24px;
}
.links-hero {
  display: grid;
  align-items: center;
  min-height: 330px;
  padding: clamp(28px, 6vw, 64px);
  border-radius: 12px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}
.links-hero-content {
  max-width: 680px;
  color: white;
}
.links-hero h1 {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 3rem);
  line-height: 1.15;
}
.links-hero p {
  margin: 18px 0 0;
  font-size: clamp(1rem, 1.8vw, 1.15rem);
  line-height: 1.6;
}
.social-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}
.video-container {
  position: relative;
  width: 100%;
  padding-top: 56.25%;
}
.video-container iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
</style>
