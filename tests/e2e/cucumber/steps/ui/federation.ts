import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { World } from '../../environment'
import { objects } from '../../../support'
import { substitute } from '../../../support/utils'

Given(
  '{string} generates invitation token for the federation share',
  async function (this: World, stepUser: any): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const pageObject = new objects.scienceMesh.Federation({ page })
    const user = this.usersEnvironment.getUser({ key: stepUser })
    await pageObject.generateInvitation(user.id)
  }
)

When(
  '{string} accepts federated share invitation by local user {string}',
  async function (this: World, stepUser: string, sharer: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const pageObject = new objects.scienceMesh.Federation({ page })
    await pageObject.acceptInvitation(sharer)
  }
)

Then(
  '{string} should see the following federated connections:',
  async function (this: World, stepUser: any, stepTable: DataTable): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const pageObject = new objects.scienceMesh.Federation({ page })
    for (const info of stepTable.hashes()) {
      info.user = substitute(info.user)
      info.email = substitute(info.email)
      const isConnectionExist = await pageObject.connectionExists(info)
      expect(isConnectionExist).toBeTruthy()
    }
  }
)
