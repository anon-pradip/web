import {
  Headers,
  ProgressEventCallback,
  RequestOptionsCustom,
  WebDAVClient,
  createClient
} from 'webdav'
import { v4 as uuidV4 } from 'uuid'
import { encodePath, urlJoin } from '../../utils'
import { DavMethod, DavPropertyValue } from '../constants'
import { buildPropFindBody, buildPropPatchBody } from './builders'
import { parseError, parseMultiStatus, parseTusHeaders } from './parsers'
import { WebDavResponseResource } from '../../helpers'
import { HttpError } from '../../errors'
import { AxiosInstance } from 'axios'

export interface DAVOptions {
  axiosClient: AxiosInstance
  baseUrl: string
}

export interface DavResult {
  body: WebDavResponseResource[] | undefined
  status: number
  result: Response
}

export class DAV {
  private client: WebDAVClient
  private axiosClient: AxiosInstance
  private davPath: string

  constructor({ axiosClient, baseUrl }: DAVOptions) {
    this.davPath = urlJoin(baseUrl, 'remote.php/dav')
    this.client = createClient(this.davPath, {})
    this.axiosClient = axiosClient
  }

  public mkcol(path: string, { headers = {} }: { headers?: Headers } = {}) {
    return this.request(DavMethod.mkcol, path, { headers })
  }

  public async propfind(
    path: string,
    {
      depth = 1,
      properties = [],
      headers = {}
    }: { depth?: number; properties?: DavPropertyValue[]; headers?: Headers } = {}
  ) {
    const requestHeaders = { ...headers, Depth: depth.toString() }
    const { body, result } = await this.request(DavMethod.propfind, path, {
      body: buildPropFindBody(properties),
      headers: requestHeaders
    })

    if (body?.length) {
      // add tus info to current folder only
      body[0].tusSupport = parseTusHeaders(result.headers)
    }

    return body
  }

  public async report(
    path: string,
    {
      pattern = '',
      filterRules = null,
      limit = 30,
      properties,
      headers = {}
    }: {
      pattern?: string
      filterRules?: Partial<Record<DavPropertyValue, unknown>>
      limit?: number
      properties?: DavPropertyValue[]
      headers?: Headers
    } = {}
  ) {
    const { body, result } = await this.request(DavMethod.report, path, {
      body: buildPropFindBody(properties, { pattern, filterRules, limit }),
      headers
    })

    return {
      results: body,
      range: result.headers.get('content-range')
    }
  }

  public copy(
    source: string,
    target: string,
    { overwrite = false, headers = {} }: { overwrite?: boolean; headers?: Headers } = {}
  ) {
    const targetUrl = urlJoin(this.davPath, encodePath(target))
    return this.request(DavMethod.copy, source, {
      headers: { ...headers, Destination: targetUrl, overwrite: overwrite ? 'T' : 'F' }
    })
  }

  public move(
    source: string,
    target: string,
    { overwrite = false, headers = {} }: { overwrite?: boolean; headers?: Headers } = {}
  ) {
    const targetUrl = urlJoin(this.davPath, encodePath(target))
    return this.request(DavMethod.move, source, {
      headers: { ...headers, Destination: targetUrl, overwrite: overwrite ? 'T' : 'F' }
    })
  }

  public put(
    path: string,
    content: string | ArrayBuffer,
    {
      headers = {},
      onUploadProgress,
      previousEntityTag,
      overwrite
    }: {
      headers?: Headers
      onUploadProgress?: ProgressEventCallback
      previousEntityTag?: string
      overwrite?: boolean
    } = {}
  ) {
    const requestHeaders = { ...headers }
    if (previousEntityTag) {
      // will ensure that no other client uploaded a different version meanwhile
      requestHeaders['If-Match'] = previousEntityTag
    } else if (!overwrite) {
      // will trigger 412 precondition failed if a file already exists
      requestHeaders['If-None-Match'] = '*'
    }

    return this.request(DavMethod.put, path, {
      body: content,
      headers: requestHeaders,
      options: { onUploadProgress }
    })
  }

  public delete(path: string, { headers = {} }: { headers?: Headers } = {}) {
    return this.request(DavMethod.delete, path, { headers })
  }

  public propPatch(
    path: string,
    properties: Partial<Record<DavPropertyValue, unknown>>,
    { headers = {} }: { headers?: Headers } = {}
  ) {
    const body = buildPropPatchBody(properties)
    return this.request(DavMethod.proppatch, path, { body, headers })
  }

  public getFileUrl(path: string) {
    return urlJoin(this.davPath, encodePath(path))
  }

  private buildHeaders(headers: Headers = {}): Headers {
    const authHeader = this.axiosClient.defaults.headers.Authorization
    const languageHeader = this.axiosClient.defaults.headers['Accept-Language']
    const initiatorIdHeader = this.axiosClient.defaults.headers['Initiator-ID']

    return {
      ...(authHeader && { Authorization: authHeader.toString() }),
      ...(languageHeader && { 'Accept-Language': languageHeader.toString() }),
      ...(initiatorIdHeader && { 'Initiator-ID': initiatorIdHeader.toString() }),
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Request-ID': uuidV4(),
      ...headers
    }
  }

  private async request(
    method: DavMethod,
    path: string,
    {
      body,
      headers,
      options
    }: {
      body?: string | ArrayBuffer
      headers?: Headers
      options?: Partial<RequestOptionsCustom>
    } = {}
  ): Promise<DavResult> {
    const url = urlJoin(this.davPath, encodePath(path), { leadingSlash: true })

    const requestOptions = {
      url,
      method,
      headers: this.buildHeaders(headers),
      data: body,
      ...options
    } as RequestOptionsCustom

    try {
      const result = (await this.client.customRequest('', requestOptions)) as unknown as Response

      let resultBody: WebDavResponseResource[]
      if (result.status === 207) {
        const parsedBody = await result.text()
        resultBody = await parseMultiStatus(parsedBody)
      }

      return {
        body: resultBody,
        status: result.status,
        result
      }
    } catch (error) {
      const { response } = error
      const body = await response.text()
      const errorMessage = parseError(body)
      throw new HttpError(errorMessage, response, response.status)
    }
  }
}
