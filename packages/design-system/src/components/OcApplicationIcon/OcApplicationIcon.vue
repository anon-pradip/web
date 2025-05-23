<template>
  <div class="oc-application-icon oc-flex-inline oc-flex-middle oc-flex-center" :style="iconStyle">
    <oc-icon :name="icon" :color="iconColor" size="medium" />
  </div>
</template>

<script lang="ts" setup>
import {
  generateHashedColorForString,
  getHexFromCssVar,
  hexToRgb,
  rgbToHex,
  setDesiredContrastRatio,
  calculateShadeColor
} from '../../helpers'
import { computed, unref } from 'vue'
import OcIcon from '../OcIcon/OcIcon.vue'

/**
 * OcApplicationIcon - A component for displaying application icons with customizable colors and gradients.
 *
 * @prop {string} icon - The name of the icon to display. This is required.
 * @prop {string} [colorPrimary=''] - The primary color for the icon background. If not provided, a hashed color based on the icon name will be generated.
 * @prop {string} [colorSecondary=''] - The secondary color for the icon background gradient. If not provided, a shade of the primary color will be used.
 *
 * @example
 * ```vue
 * <!-- Default usage with hashed color -->
 * <oc-application-icon icon="icon-name" />
 *
 * <!-- With a primary color -->
 * <oc-application-icon icon="icon-name" colorPrimary="#000" />
 *
 * <!-- With primary and secondary colors -->
 * <oc-application-icon icon="icon-name" colorPrimary="#000" colorSecondary="#fff" />
 * ```
 */

interface Props {
  icon: string
  colorPrimary?: string
  colorSecondary?: string
}
defineOptions({
  name: 'OcApplicationIcon',
  components: { OcIcon },
  status: 'ready',
  release: '15.0.0'
})

const { icon, colorPrimary = '', colorSecondary = '' } = defineProps<Props>()

const iconColor = computed(() => {
  return 'rgba(255,255,255,0.7)'
})
const getGradient = (primary: string, secondary: string): string => {
  return `linear-gradient(90deg, ${primary} 0%, ${secondary} 100%)`
}
const primaryColor = computed(() => {
  return getHexFromCssVar(colorPrimary)
})
const secondaryColor = computed(() => {
  return getHexFromCssVar(colorSecondary)
})
const hasPrimaryColor = computed(() => {
  return !!colorPrimary
})
const hasSecondaryColor = computed((): boolean => {
  return !!colorSecondary
})
const generatedHashedPrimaryColor = computed((): string => {
  const hashedColor = generateHashedColorForString(icon)
  return rgbToHex(setDesiredContrastRatio(hexToRgb(hashedColor), hexToRgb('#ffffff'), 4))
})
const iconStyle = computed(() => {
  const primaryHex = unref(hasPrimaryColor)
    ? unref(primaryColor)
    : unref(generatedHashedPrimaryColor)
  const secondaryHex = unref(hasSecondaryColor)
    ? unref(secondaryColor)
    : calculateShadeColor(hexToRgb(primaryHex), 40)

  const darkBorderHex = calculateShadeColor(hexToRgb(primaryHex), -25)
  const lightBorderHex = calculateShadeColor(hexToRgb(primaryHex), 45)
  return {
    background: getGradient(primaryHex, secondaryHex),
    boxShadow: `inset ${lightBorderHex} 0px 0px 1px 0px,${darkBorderHex} 0px 0px 1px 0px`
  }
})
</script>

<style lang="scss">
.oc-application-icon {
  width: 28px;
  height: 28px;
  border-radius: 4px;

  .oc-icon {
    height: 18px !important;
    max-height: 18px !important;
    max-width: 18px !important;
    width: 18px !important;

    svg {
      fill: var(--oc-color-swatch-primary-contrast) !important;
      height: 18px !important;
      max-height: 18px !important;
      max-width: 18px !important;
      width: 18px !important;
    }
  }
}
</style>

<docs>
```js
// No color: (color will be hash generated by icon name)
<oc-application-icon icon="account-box"/>

// With primary color:
<oc-application-icon icon="account-box" colorPrimary="#37BC07"/>

// With primary and secondary color:
<oc-application-icon icon="account-box" colorPrimary="#37BC07" colorSecondary="#37BC07"/>
```
</docs>
