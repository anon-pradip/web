<template>
  <div
    class="oc-resource oc-text-overflow"
    :class="{ 'oc-resource-no-interaction': !isResourceClickable }"
  >
    <resource-link
      v-if="isIconDisplayed"
      :resource="resource"
      :link="link"
      :is-resource-clickable="isResourceClickable"
      class="oc-resource-icon-link"
      @click="emitClick"
    >
      <oc-img
        v-if="hasThumbnail"
        :key="thumbnail"
        v-oc-tooltip="tooltipLabelIcon"
        :src="thumbnail"
        class="oc-resource-thumbnail"
        width="40"
        height="40"
        :aria-label="tooltipLabelIcon"
      />
      <resource-icon
        v-else
        v-oc-tooltip="tooltipLabelIcon"
        :aria-label="tooltipLabelIcon"
        :resource="resource"
      />
    </resource-link>
    <div class="oc-resource-details oc-text-overflow" :class="{ 'oc-pl-s': isIconDisplayed }">
      <resource-link
        :resource="resource"
        :is-resource-clickable="isResourceClickable"
        :link="link"
        class="oc-text-overflow"
        @click="emitClick"
      >
        <resource-name
          :key="resource.name"
          :name="resource.name"
          :extension="resource.extension"
          :type="resource.type"
          :full-path="resource.path"
          :is-path-displayed="isPathDisplayed"
          :is-extension-displayed="
            isExtensionDisplayed && !HIDDEN_EXTENSIONS.includes(resource.extension)
          "
        />
      </resource-link>
      <div class="oc-resource-indicators">
        <component
          :is="parentFolderComponentType"
          v-if="isPathDisplayed"
          v-oc-tooltip="parentFolderPathTooltip"
          :to="parentFolderLink"
          :style="parentFolderStyle"
          class="parent-folder oc-text-truncate"
        >
          <oc-icon v-bind="parentFolderLinkIconAttrs" />
          <span class="text oc-text-truncate" v-text="parentFolderName" />
        </component>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { computed, defineComponent, PropType } from 'vue'
import { Resource } from '@ownclouders/web-client'
import ResourceIcon from './ResourceIcon.vue'
import ResourceLink from './ResourceLink.vue'
import ResourceName from './ResourceName.vue'
import { RouteLocationRaw } from 'vue-router'
import { HIDDEN_FILE_EXTENSIONS } from '../../constants'
import { dirname, join } from 'node:path'
/**
 * Displays a resource together with the resource type icon or thumbnail
 */
export default defineComponent({
  name: 'ResourceListItem',
  components: { ResourceIcon, ResourceLink, ResourceName },
  props: {
    /**
     * The resource to be displayed
     */
    resource: {
      type: Object as PropType<Resource>,
      required: true
    },
    /**
     * The prefix that will be shown in the path
     */
    pathPrefix: {
      type: String,
      required: false,
      default: ''
    },
    /**
     * The resource link
     */
    link: {
      type: Object as PropType<RouteLocationRaw>,
      required: false,
      default: null
    },
    /**
     * Asserts whether the resource path should be displayed
     */
    isPathDisplayed: {
      type: Boolean,
      required: false,
      default: false
    },
    /**
     * The resource parent folder link path
     */
    parentFolderLink: {
      type: Object,
      required: false,
      default: null
    },
    /**
     * The resource parent folder name to be displayed
     */
    parentFolderName: {
      type: String,
      required: false,
      default: ''
    },
    /**
     * The resource parent folder link path icon additional attributes
     */
    parentFolderLinkIconAdditionalAttributes: {
      type: Object,
      required: false,
      default: () => ({})
    },
    /**
     * Asserts whether the resource extension should be displayed
     */
    isExtensionDisplayed: {
      type: Boolean,
      required: false,
      default: true
    },
    /**
     * Asserts whether the resource thumbnail should be displayed
     */
    isThumbnailDisplayed: {
      type: Boolean,
      required: false,
      default: true
    },
    /**
     * Asserts whether the resource thumbnail should be displayed
     */
    isIconDisplayed: {
      type: Boolean,
      required: false,
      default: true
    },
    /**
     * Asserts whether clicking on the resource name triggers any action
     */
    isResourceClickable: {
      type: Boolean,
      required: false,
      default: true
    }
  },
  emits: ['click'],

  setup(props) {
    const parentFolderPathTooltip = computed(() => {
      if (!props.isPathDisplayed) {
        return null
      }

      const parentFolderPath = dirname(props.resource.path)

      if (props.pathPrefix) {
        return join(props.pathPrefix, parentFolderPath).replaceAll('/', ' > ')
      }

      return parentFolderPath.replaceAll('/', ' > ')
    })

    return { HIDDEN_EXTENSIONS: HIDDEN_FILE_EXTENSIONS, parentFolderPathTooltip }
  },

  computed: {
    parentFolderComponentType() {
      return this.parentFolderLink ? 'router-link' : 'span'
    },

    parentFolderStyle() {
      return {
        cursor: this.parentFolderLink ? 'pointer' : 'default'
      }
    },

    parentFolderLinkIconAttrs() {
      return {
        'fill-type': 'line',
        name: 'folder-2',
        size: 'small',
        ...this.parentFolderLinkIconAdditionalAttributes
      }
    },

    hasThumbnail() {
      return (
        this.isThumbnailDisplayed &&
        Object.prototype.hasOwnProperty.call(this.resource, 'thumbnail')
      )
    },

    thumbnail() {
      return this.resource.thumbnail
    },

    tooltipLabelIcon() {
      if (this.resource.locked) {
        return this.$gettext('This item is locked')
      }
      return null
    }
  },

  methods: {
    emitClick() {
      /**
       * Triggered when the resource is a file and the name is clicked
       */
      this.$emit('click')
    }
  }
})
</script>

<style lang="scss">
.oc-resource {
  align-items: center;
  display: inline-flex;
  justify-content: flex-start;
  overflow: visible !important;

  &-no-interaction {
    pointer-events: none;
  }

  &-icon-link {
    position: relative;
  }

  &-thumbnail {
    border-radius: 2px;
    object-fit: cover;
    height: $oc-size-icon-default * 1.5;
    max-height: $oc-size-icon-default * 1.5;
    width: $oc-size-icon-default * 1.5;
    max-width: $oc-size-icon-default * 1.5;
  }

  &-details {
    display: block;

    a {
      text-decoration: none;
    }

    a:hover,
    a:focus {
      outline-offset: 0;
    }
  }

  &-indicators {
    display: flex;

    a {
      &:hover {
        background-color: var(--oc-color-input-bg);
        border-radius: 2px;
      }

      .text {
        &:hover {
          color: var(--oc-color-text-default);
          text-decoration: underline;
        }
      }
    }

    .parent-folder {
      display: flex;
      align-items: center;

      padding: 0 2px 0 2px;
      margin: 0 8px 0 -2px;

      .oc-icon {
        padding-right: 3px;
      }

      .text {
        font-size: 0.8125rem;
        color: var(--oc-color-text-muted);
      }
    }
  }
}
</style>
