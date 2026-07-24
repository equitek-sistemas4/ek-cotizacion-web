import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

export const themeColors = {
  primary: '#1e2436',
  secondary: '#fd363c',
  background: '#f4f7f6',
  surface: '#ffffff',
  appBackground: '#f4f7f6',
  textPrimary: '#10201d',
  textMuted: '#64748b',
  border: '#d9e3df',
}

export const themeColorsDark = {
  primary: '#1e2436',
  secondary: '#fd363c',
  textPrimary: '#f8fafc',
  textMuted: '#cbd5e1',
  border: '#475569',
}

export default createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: themeColors,
      },
      dark: {
        colors: themeColorsDark,
      },
    },
  },
})
