import { useUserActionsEditLogin } from '../../../../../src/composables/actions/users/useUserActionsEditLogin'
import { mock } from 'jest-mock-extended'
import { unref } from 'vue'
import { User } from 'web-client/src/generated'
import { eventBus } from 'web-pkg/src'
import { getComposableWrapper } from 'web-test-helpers'

describe('useUserActionsEditLogin', () => {
  describe('method "isEnabled"', () => {
    it.each([
      { resources: [], isEnabled: false },
      { resources: [mock<User>()], isEnabled: true },
      { resources: [mock<User>(), mock<User>()], isEnabled: true }
    ])('requires at least one user to be enabled', ({ resources, isEnabled }) => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isEnabled({ resources })).toEqual(isEnabled)
        }
      })
    })
  })
  describe('method "handler"', () => {
    it('emits an event', () => {
      getWrapper({
        setup: ({ actions }) => {
          const eventSpy = jest.spyOn(eventBus, 'publish')
          unref(actions)[0].handler()
          expect(eventSpy).toHaveBeenCalledWith('app.admin-settings.users.actions.edit-login')
        }
      })
    })
  })
})

function getWrapper({
  setup
}: {
  setup: (instance: ReturnType<typeof useUserActionsEditLogin>) => void
}) {
  return {
    wrapper: getComposableWrapper(() => {
      const instance = useUserActionsEditLogin()
      setup(instance)
    })
  }
}