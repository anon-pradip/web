import { useUploadHelpers } from '../../../../src/composables/upload'
import { mockDeep } from 'jest-mock-extended'
import { SpaceResource } from 'web-client/src/helpers'
import { ComputedRef, computed } from '@vue/composition-api'
import { defaultStoreMockOptions } from 'web-test-helpers/src/mocks/store/defaultStoreMockOptions'
import { createStore, defaultComponentMocks, getComposableWrapper } from 'web-test-helpers'

describe('useUploadHelpers', () => {
  const currentPathMock = 'path'
  const uploadPathMock = 'path'

  const mockFile = {
    name: '',
    type: 'dir',
    fileInfo: {
      '{http://owncloud.org/ns}permissions': 'RDNVCK',
      '{http://owncloud.org/ns}favorite': '0',
      '{http://owncloud.org/ns}fileid': '3861',
      '{http://owncloud.org/ns}owner-id': 'alice',
      '{http://owncloud.org/ns}owner-display-name': 'alice',
      '{http://owncloud.org/ns}share-types': '',
      '{http://owncloud.org/ns}privatelink': 'http://host.docker.internal:8080/f/3861',
      '{http://owncloud.org/ns}size': '7546347',
      '{DAV:}getlastmodified': 'Mon, 14 Jun 2021 09:41:16 GMT',
      '{DAV:}getetag': '"60c7243c2e7f1"',
      '{DAV:}resourcetype': ['{DAV:}collection']
    },
    tusSupport: null
  }

  it('should be valid', () => {
    expect(useUploadHelpers).toBeDefined()
  })

  it('converts normal files to uppy resources', () => {
    const mocks = defaultComponentMocks({
      currentRoute: {
        name: 'some-route',
        params: {
          item: currentPathMock
        }
      }
    })
    mocks.$clientService.owncloudSdk.files.getFileUrl.mockResolvedValue(uploadPathMock)
    mocks.$clientService.owncloudSdk.files.fileInfo.mockResolvedValue(mockFile)
    const storeOptions = defaultStoreMockOptions
    const store = createStore(storeOptions)
    getComposableWrapper(
      () => {
        const fileName = 'filename'
        const { inputFilesToUppyFiles } = useUploadHelpers({
          space: mockDeep<ComputedRef<SpaceResource>>(),
          currentFolder: computed(() => '')
        })
        const uppyResources = inputFilesToUppyFiles([{ name: fileName }])
        expect(uppyResources.length).toBe(1)

        for (const uppyResource of uppyResources) {
          // TODO: this would probably need some more checks on props and a proper space mock.
          expect(uppyResource.name).toBe(fileName)
          expect(uppyResource.meta).not.toBeUndefined()
        }
      },
      { mocks, store }
    )
  })
})
