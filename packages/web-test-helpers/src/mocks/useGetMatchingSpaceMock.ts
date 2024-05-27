import { mock } from 'vitest-mock-extended'
import { SpaceResource } from '../../../web-client/src'
import { useGetMatchingSpace } from '../../../web-pkg'

export const useGetMatchingSpaceMock = (
  options: Partial<ReturnType<typeof useGetMatchingSpace>> = {}
): ReturnType<typeof useGetMatchingSpace> => {
  return {
    getInternalSpace() {
      return mock<SpaceResource>()
    },
    getMatchingSpace() {
      return mock<SpaceResource>()
    },
    isResourceAccessible() {
      return false
    },
    isPersonalSpaceRoot() {
      return false
    },
    ...options
  }
}
