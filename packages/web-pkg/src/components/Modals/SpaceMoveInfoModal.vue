<template>
  <p
    class="oc-mt-rm"
    v-text="
      $gettext(
        'Moving files from one space to another is not possible. Do you want to copy instead?'
      )
    "
  />
  <p
    class="oc-mb-rm"
    v-text="$gettext('Note: Links and shares of the original file are not copied.')"
  />
</template>

<script lang="ts">
import { Modal } from '../../composables/piniaStores'
import { PropType, defineComponent } from 'vue'

export default defineComponent({
  name: 'SpaceMoveInfoModal',
  props: {
    modal: { type: Object as PropType<Modal>, required: true }
  }
})
</script>
