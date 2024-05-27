import ApplicationsMenu from 'web-runtime/src/components/Topbar/ApplicationsMenu.vue'
import {
  RouteLocation,
  defaultComponentMocks,
  defaultPlugins,
  shallowMount
} from 'web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { MenuItem } from 'web-runtime/src/helpers/menuItems'
import { SpaceResource } from '@ownclouders/web-client'

vi.mock('@ownclouders/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useFileActions: vi.fn(() => ({ openEditor: vi.fn() }))
}))

const menuLinks = [
  {
    icon: 'folder',
    iconUrl: undefined,
    title: 'Files',
    path: '/files'
  },
  {
    icon: 'some-icon',
    iconUrl: undefined,
    title: 'External',
    url: 'http://some.org',
    target: '_blank'
  }
] as MenuItem[]

describe('ApplicationsMenu component', () => {
  it('should render navigation with button and menu items in dropdown', () => {
    const { wrapper } = getWrapper(menuLinks)
    expect(wrapper.html()).toMatchSnapshot()
  })
})

function getWrapper(applicationsList: MenuItem[] = []) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ query: { app: 'admin-settings' } })
    }),
    space: {
      driveType: 'personal',
      spaceRoles: { viewer: [], editor: [], manager: [] }
    } as unknown as SpaceResource
  }

  return {
    wrapper: shallowMount(ApplicationsMenu, {
      props: {
        applicationsList
      },
      global: {
        renderStubDefaultSlot: true,
        mocks,
        provide: mocks,
        plugins: [...defaultPlugins()]
      }
    })
  }
}
