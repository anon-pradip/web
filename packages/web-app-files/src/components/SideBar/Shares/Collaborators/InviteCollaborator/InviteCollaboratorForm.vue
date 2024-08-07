<template>
  <div id="new-collaborators-form" data-testid="new-collaborators-form">
    <div :class="['oc-flex', 'oc-width-1-1', { 'new-collaborators-form-cern': isRunningOnEos }]">
      <oc-select
        v-if="isRunningOnEos"
        id="files-share-account-type-input"
        v-model="accountType"
        :options="accountTypes"
        :label="$gettext('Account type')"
        class="cern-account-type-input"
        :reduce="(option: AccountType) => option.description"
      >
        <template #option="{ description }">
          <span class="option oc-text-xsmall" v-text="description" />
        </template>
        <template #selected-option="{ description }">
          <span class="option oc-text-xsmall" v-text="description" />
        </template>
      </oc-select>
      <oc-select
        id="files-share-invite-input"
        ref="ocSharingAutocomplete"
        :class="['oc-width-1-1', { 'cern-files-share-invite-input': isRunningOnEos }]"
        :model-value="selectedCollaborators"
        :options="autocompleteResults"
        :loading="searchInProgress"
        :multiple="true"
        :filter="filterRecipients"
        :label="selectedCollaboratorsLabel"
        aria-describedby="files-share-invite-hint"
        :dropdown-should-open="
          ({ open, search }: DropDownShouldOpenOptions) => open && search.length >= minSearchLength && !searchInProgress
        "
        @search:input="onSearch"
        @update:model-value="resetFocusOnInvite"
        @open="onOpen"
        @close="onClose"
      >
        <template #option="option">
          <autocomplete-item class="mark-element" :item="option" />
        </template>
        <template #no-options>
          <span v-text="$gettext('No users or groups found.')" />
        </template>
        <template #selected-option-container="{ option, deselect }">
          <recipient-container :key="option.id" :recipient="option" :deselect="deselect" />
        </template>
        <template #open-indicator>
          <!-- Empty to hide the caret -->
          <span />
        </template>
      </oc-select>
    </div>
    <div class="oc-flex oc-flex-between oc-flex-wrap oc-mb-l oc-mt-s">
      <role-dropdown
        mode="create"
        :show-icon="isRunningOnEos"
        class="role-selection-dropdown"
        @option-change="collaboratorRoleChanged"
      />
      <div class="oc-flex">
        <div v-if="expirationDate" class="oc-flex oc-flex-middle">
          <oc-icon
            v-oc-tooltip="formattedExpirationDate"
            class="files-collaborators-collaborator-expiration"
            data-testid="recipient-info-expiration-date"
            :aria-label="formattedExpirationDate"
            name="calendar-event"
            fill-type="line"
          />
          <span class="oc-invisible-sr" v-text="screenreaderShareExpiration" />
        </div>
        <oc-button
          id="show-more-share-options-btn"
          class="oc-mx-s"
          :aria-label="$gettext('Show more actions')"
          appearance="raw"
        >
          <oc-icon name="more-2" />
          <oc-drop
            ref="showMoreShareOptionsDropRef"
            :drop-id="'show-more-share-options-drop'"
            :toggle="'#show-more-share-options-btn'"
            mode="click"
            padding-size="small"
          >
            <oc-list
              class="collaborator-edit-dropdown-options-list"
              :aria-label="'shareEditOptions'"
            >
              <li class="oc-rounded oc-menu-item-hover">
                <expiration-datepicker
                  v-if="!saving"
                  :share-types="selectedCollaborators.map(({ shareType }) => shareType)"
                  @option-change="collaboratorExpiryChanged"
                />
              </li>
            </oc-list>
          </oc-drop>
        </oc-button>
        <oc-button
          id="new-collaborators-form-create-button"
          key="new-collaborator-save-button"
          data-testid="new-collaborators-form-create-button"
          :disabled="!$_isValid || saving"
          :variation="saving ? 'passive' : 'primary'"
          :appearance="saving ? 'outline' : 'filled'"
          submit="submit"
          :show-spinner="savingDelayed"
          @click="share"
        >
          <span v-text="$gettext(saveButtonLabel)" />
        </oc-button>
      </div>
      <div class="oc-width-1-1 oc-mt-s">
        <oc-checkbox
          v-if="isRunningOnEos"
          v-model="notifyEnabled"
          :value="false"
          :label="$gettext('Notify via mail')"
        />
      </div>
    </div>
    <oc-hidden-announcer level="assertive" :announcement="announcement" />
  </div>
</template>

<script lang="ts">
import { debounce } from 'lodash-es'
import PQueue from 'p-queue'
import Mark from 'mark.js'
import { storeToRefs } from 'pinia'
import AutocompleteItem from './AutocompleteItem.vue'
import RoleDropdown from '../RoleDropdown.vue'
import RecipientContainer from './RecipientContainer.vue'
import ExpirationDatepicker from './ExpirationDatepicker.vue'
import {
  CollaboratorAutoCompleteItem,
  CollaboratorShare,
  GraphShareRoleIdMap,
  ShareRole,
  ShareTypes,
  call
} from '@ownclouders/web-client'
import {
  useCapabilityStore,
  useClientService,
  useMessages,
  useSpacesStore,
  useConfigStore,
  useSharesStore,
  useUserStore
} from '@ownclouders/web-pkg'

import { computed, defineComponent, inject, ref, unref, watch, onMounted, nextTick } from 'vue'
import { Resource, SpaceResource } from '@ownclouders/web-client'
import { formatDateFromDateTime, formatRelativeDateFromDateTime } from '@ownclouders/web-pkg'
import { DateTime } from 'luxon'
import { OcDrop } from 'design-system/src/components'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import { isProjectSpaceResource } from '@ownclouders/web-client'

// just a dummy function to trick gettext tools
const $gettext = (str: string) => {
  return str
}

type AccountType = {
  prefix: string
  description: string
}

type DropDownShouldOpenOptions = { open: boolean; search: string[] }

export default defineComponent({
  name: 'InviteCollaboratorForm',
  components: {
    AutocompleteItem,
    RoleDropdown,
    RecipientContainer,
    ExpirationDatepicker
  },
  props: {
    saveButtonLabel: {
      type: String,
      required: false,
      default: () => $gettext('Share')
    },
    inviteLabel: {
      type: String,
      required: false,
      default: ''
    }
  },

  setup() {
    const { $gettext } = useGettext()
    const clientService = useClientService()
    const { showMessage, showErrorMessage } = useMessages()
    const spacesStore = useSpacesStore()
    const { upsertSpace, upsertSpaceMember } = spacesStore
    const capabilityStore = useCapabilityStore()
    const capabilityRefs = storeToRefs(capabilityStore)
    const configStore = useConfigStore()
    const userStore = useUserStore()

    const sharesStore = useSharesStore()
    const { addShare } = sharesStore
    const { collaboratorShares, graphRoles } = storeToRefs(sharesStore)

    const searchQuery = ref('')
    const searchInProgress = ref(false)
    const autocompleteResults = ref<CollaboratorAutoCompleteItem[]>([])

    const saving = ref(false)
    const savingDelayed = ref(false)
    const notifyEnabled = ref(false)
    const expirationDate = ref<string>()
    const selectedCollaborators = ref<CollaboratorAutoCompleteItem[]>([])
    const announcement = ref<string>()
    const selectedRole = ref<ShareRole>()

    const resource = inject<Resource>('resource')
    const space = inject<SpaceResource>('space')

    const resourceIsSpace = computed(() => unref(resource).type === 'space')

    const markInstance = ref(null)

    const isOpen = ref(false)

    const onOpen = () => {
      isOpen.value = true
    }

    const onClose = () => {
      isOpen.value = false
    }

    watch(saving, (newValue) => {
      if (!newValue) {
        savingDelayed.value = false
        return
      }
      setTimeout(() => {
        if (!unref(saving)) {
          savingDelayed.value = false
          return
        }
        savingDelayed.value = true
      }, 700)
    })

    watch([autocompleteResults, isOpen], async () => {
      if (!unref(isOpen)) {
        return
      }

      await nextTick()
      unref(markInstance)?.unmark()
      unref(markInstance)?.mark(unref(searchQuery), {
        element: 'span',
        className: 'mark-highlight'
      })
    })

    onMounted(async () => {
      selectedRole.value = unref(resourceIsSpace)
        ? unref(graphRoles).find(({ id }) => id === GraphShareRoleIdMap.SpaceViewer)
        : unref(graphRoles).find(({ id }) => id === GraphShareRoleIdMap.Viewer)

      await nextTick()
      markInstance.value = new Mark('.mark-element')
    })

    const accountType = ref('standard')
    const accountTypes: AccountType[] = [
      { prefix: '', description: 'standard' },
      { prefix: 'a:', description: 'secondary' },
      { prefix: 'a:', description: 'service' },
      { prefix: 'l:', description: 'guest' },
      { prefix: 'sm:', description: 'federated' }
    ]

    const createSharesConcurrentRequests = computed(() => {
      return configStore.options.concurrentRequests.shares.create
    })

    const fetchRecipientsTask = useTask(function* (signal, query: string) {
      const client = clientService.graphAuthenticated
      const userData = yield* call(
        client.users.listUsers({ orderBy: ['displayName'], search: `"${query}"` }, { signal })
      )

      const groupData = yield* call(
        client.groups.listGroups({ orderBy: ['displayName'], search: `"${query}"` }, { signal })
      )

      const users = (userData || []).map((u) => ({
        ...u,
        shareType: ShareTypes.user.value
      })) as CollaboratorAutoCompleteItem[]

      const groups = (groupData || []).map((u) => ({
        ...u,
        shareType: ShareTypes.group.value
      })) as CollaboratorAutoCompleteItem[]

      autocompleteResults.value = [...users, ...groups].filter(
        (collaborator: CollaboratorAutoCompleteItem) => {
          if (collaborator.id === userStore.user.id) {
            // filter current user
            return false
          }

          const selected = unref(selectedCollaborators).some(({ id }) => collaborator.id === id)
          const existingShares = unref(collaboratorShares).filter((c) => !c.indirect)
          const exists = existingShares.some((s) => s.sharedWith.id === collaborator.id)

          if (selected || exists) {
            return false
          }

          announcement.value = $gettext('Person was added')

          return true
        }
      )
      searchInProgress.value = false
    }).restartable()

    const fetchRecipients = async (query: string) => {
      await fetchRecipientsTask.perform(query)
    }

    const share = async () => {
      saving.value = true

      const saveQueue = new PQueue({ concurrency: unref(createSharesConcurrentRequests) })
      const savePromises: Promise<void>[] = []
      const errors: { displayName: string; error: Error }[] = []
      const addedShares: CollaboratorShare[] = []

      unref(selectedCollaborators).forEach(({ id, shareType, displayName }) => {
        const type = shareType === ShareTypes.group.value ? 'group' : 'user'

        savePromises.push(
          saveQueue.add(async () => {
            try {
              const share = await addShare({
                clientService,
                space: unref(space),
                resource: unref(resource),
                options: {
                  roles: [unref(selectedRole).id],
                  expirationDateTime: unref(expirationDate),
                  recipients: [
                    {
                      objectId: id,
                      '@libre.graph.recipient.type': type
                    }
                  ]
                }
              })

              addedShares.push(share)
            } catch (error) {
              console.error(error)
              errors.push({ displayName, error })
              throw error
            }
          })
        )
      })

      const results = await Promise.allSettled(savePromises)

      if (isProjectSpaceResource(unref(resource))) {
        const updatedSpace = await clientService.graphAuthenticated.drives.getDrive(
          unref(resource).id
        )

        upsertSpace(updatedSpace)

        addedShares.forEach((member) => {
          upsertSpaceMember({ member })
        })
      }

      if (results.length !== errors.length) {
        showMessage({ title: $gettext('Share was added successfully') })
      }

      errors.forEach((e) => {
        showErrorMessage({
          title: $gettext('Failed to add share for "%{displayName}"', {
            displayName: e.displayName
          }),
          errors: [e.error]
        })
      })

      expirationDate.value = null
      selectedCollaborators.value = []
      saving.value = false
    }

    return {
      minSearchLength: capabilityRefs.sharingSearchMinLength,
      isRunningOnEos: computed(() => configStore.options.runningOnEos),
      saving,
      savingDelayed,
      ...useMessages(),
      searchInProgress,
      searchQuery,
      autocompleteResults,
      onOpen,
      onClose,
      expirationDate,
      selectedRole,
      announcement,
      selectedCollaborators,
      fetchRecipients,
      share,

      // CERN
      accountType,
      accountTypes,
      notifyEnabled,

      // unit tests
      fetchRecipientsTask
    }
  },

  computed: {
    $_isValid() {
      return this.selectedCollaborators.length > 0
    },

    selectedCollaboratorsLabel() {
      return this.inviteLabel || this.$gettext('Search')
    },

    formattedExpirationDate() {
      return this.expirationDate === null
        ? null
        : formatDateFromDateTime(
            DateTime.fromISO(this.expirationDate).endOf('day'),
            this.$language.current
          )
    },
    expirationDateRelative() {
      return this.expirationDate === null
        ? null
        : formatRelativeDateFromDateTime(
            DateTime.fromISO(this.expirationDate).endOf('day'),
            this.$language.current
          )
    },
    screenreaderShareExpiration() {
      return this.$gettext('Share expires %{ expiryDateRelative } (%{ expiryDate })', {
        expiryDateRelative: this.expirationDateRelative,
        expiryDate: this.expirationDate
      })
    }
  },
  mounted() {
    this.fetchRecipients = debounce(this.fetchRecipients, 500)
  },

  methods: {
    onSearch(query: string) {
      this.autocompleteResults = []
      this.searchQuery = query

      if (query.length < this.minSearchLength) {
        this.searchInProgress = false

        return
      }

      this.searchInProgress = true

      // CERN
      if (this.isRunningOnEos) {
        const prefix =
          this.accountTypes.find((t) => t.description === this.accountType)?.prefix || ''
        query = `${prefix}${query}`
      }

      this.fetchRecipients(query)
    },

    filterRecipients(recipients: CollaboratorAutoCompleteItem[], query: string) {
      if (recipients.length < 1) {
        return []
      }

      // Allow advanced queries
      query = query.split(':')[1] || query

      return recipients.filter(
        (recipient) =>
          recipient.shareType === ShareTypes.remote.value ||
          recipient.displayName.toLocaleLowerCase().indexOf(query.toLocaleLowerCase()) > -1 ||
          recipient.mail?.toLocaleLowerCase().indexOf(query.toLocaleLowerCase()) > -1
      )
    },

    collaboratorRoleChanged(role: ShareRole) {
      this.selectedRole = role
    },

    collaboratorExpiryChanged({ expirationDate }: { expirationDate: string }) {
      this.expirationDate = expirationDate
      ;(this.$refs.showMoreShareOptionsDropRef as InstanceType<typeof OcDrop>).hide()
    },

    resetFocusOnInvite(event: CollaboratorAutoCompleteItem[]) {
      this.selectedCollaborators = event
      this.autocompleteResults = []
      this.$nextTick(() => {
        const inviteInput = document.getElementById('files-share-invite-input')

        inviteInput.focus()
      })
    }
  }
})
</script>
<style lang="scss">
.role-selection-dropdown {
  max-width: 150px;
}

#new-collaborators-form-create-button {
  padding-left: 30px;
  padding-right: 30px;

  .oc-spinner {
    margin-left: -0.5rem;
  }
}

.new-collaborators-form-cern > .cern-files-share-invite-input {
  width: 75%;
}

.new-collaborators-form-cern > .cern-account-type-input {
  width: 30%;
}
</style>
