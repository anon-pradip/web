<template>
  <div class="quota-information oc-flex oc-flex-bottom">
    <oc-icon name="hard-drive-2" size="small" fill-type="line" class="oc-mr-xs" />
    <div>
      <p class="oc-my-rm">
        <span class="quota-information-text" v-text="personalStorageDetailsLabel" />
      </p>
      <oc-progress
        v-if="limitedPersonalStorage"
        class="quota-information-progress-bar"
        :value="quotaUsagePercent"
        :max="100"
        size="small"
        :variation="quotaProgressVariant"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, unref } from 'vue'
import { Quota } from '@ownclouders/web-client/graph/generated'
import { filesize, FileSizeOptionsString } from 'filesize'
import { useGettext } from 'vue3-gettext'

export default defineComponent({
  name: 'QuotaInformation',
  props: {
    quota: {
      type: Object as PropType<Quota>,
      required: true,
      default: () => undefined as Quota // FIXME: hack because vue doesn't detect type
    }
  },
  setup(props) {
    const { $gettext } = useGettext()

    const limitedPersonalStorage = computed(() => {
      return props.quota.total !== 0
    })

    const quotaUsagePercent = computed(() => {
      return parseFloat(((props.quota.used / props.quota.total) * 100).toFixed(2))
    })

    const personalStorageDetailsLabel = computed(() => {
      const total = props.quota.total || 0
      const used = props.quota.used || 0
      return total
        ? $gettext('%{used} of %{total} used (%{percentage}%)', {
            used: filesize<FileSizeOptionsString>(used),
            total: filesize<FileSizeOptionsString>(total),
            percentage: (unref(quotaUsagePercent) || 0).toString()
          })
        : $gettext('%{used} used', {
            used: filesize<FileSizeOptionsString>(used),
            total: filesize<FileSizeOptionsString>(total)
          })
    })

    const quotaProgressVariant = computed(() => {
      if ((unref(quotaUsagePercent) || 0) < 80) {
        return 'primary'
      }
      if ((unref(quotaUsagePercent) || 0) < 90) {
        return 'warning'
      }
      return 'danger'
    })

    return {
      quotaUsagePercent,
      personalStorageDetailsLabel,
      limitedPersonalStorage,
      quotaProgressVariant
    }
  }
})
</script>
