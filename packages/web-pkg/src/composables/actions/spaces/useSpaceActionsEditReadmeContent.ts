import { SpaceAction, SpaceActionOptions } from '../types'
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'

import { useOpenWithDefaultApp } from '../useOpenWithDefaultApp'
import { buildSpace, getRelativeSpecialFolderSpacePath } from '@ownclouders/web-client'
import { useClientService } from '../../clientService'
import { useConfigStore, useSpacesStore, useUserStore } from '../../piniaStores'
import { useCreateSpace } from '../../spaces'
import { Drive } from '@ownclouders/web-client/graph/generated'

export const useSpaceActionsEditReadmeContent = () => {
  const clientService = useClientService()
  const { openWithDefaultApp } = useOpenWithDefaultApp()
  const { createDefaultMetaFolder } = useCreateSpace()
  const userStore = useUserStore()
  const spacesStore = useSpacesStore()
  const configStore = useConfigStore()
  const { $gettext } = useGettext()

  const handler = async ({ resources }: SpaceActionOptions) => {
    let markdownResource = null
    try {
      await clientService.webdav.getFileInfo(resources[0], { path: '.space' })
    } catch (_) {
      await createDefaultMetaFolder(resources[0])
      markdownResource = await clientService.webdav.putFileContents(resources[0], {
        path: '.space/readme.md'
      })

      const { data: updatedDriveData } = await clientService.graphAuthenticated.drives.updateDrive(
        resources[0].id,
        {
          special: [
            {
              specialFolder: {
                name: 'readme'
              },
              id: markdownResource.id
            }
          ]
        } as Drive,
        {}
      )

      spacesStore.updateSpaceField({
        id: resources[0].id,
        field: 'spaceReadmeData',
        value: buildSpace({ ...updatedDriveData, serverUrl: configStore.serverUrl }).spaceReadmeData
      })
    }

    if (!markdownResource) {
      markdownResource = await clientService.webdav.getFileInfo(resources[0], {
        path: getRelativeSpecialFolderSpacePath(resources[0], 'readme')
      })
    }

    openWithDefaultApp({ space: resources[0], resource: markdownResource })
  }

  const actions = computed((): SpaceAction[] => [
    {
      name: 'editReadmeContent',
      icon: 'article',
      label: () => {
        return $gettext('Edit description')
      },
      handler,
      isVisible: ({ resources }) => {
        if (resources.length !== 1) {
          return false
        }

        return resources[0].canEditReadme({ user: userStore.user })
      },
      componentType: 'button',
      class: 'oc-files-actions-edit-readme-content-trigger'
    }
  ])

  return {
    actions
  }
}
