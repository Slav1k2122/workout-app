import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

const bg = { background: '#0b0b0f', fit: 'contain' }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0.15, resizeOptions: bg },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: bg },
  },
  images: ['public/icon.svg'],
})
