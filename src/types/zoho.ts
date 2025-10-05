export interface ZohoFile {
  id: string
  name: string
  type: string
  is_folder: boolean
  size: number
  mime_type: string
  created_time: string
  modified_time: string
  download_url?: string
  thumbnail_url?: string
  extension?: string
  parent_id?: string
  is_shared?: boolean
  share_direction?: 'incoming' | 'outgoing'
  shared_by?: string
}

export interface ZohoApiFile {
  id?: string
  type?: string
  attributes?: {
    id?: string
    name?: string
    display_name?: string
    type?: string
    is_folder?: boolean
    size?: number
    file_size?: number
    mime_type?: string
    content_type?: string
    created_time?: string
    created_at?: string
    modified_time?: string
    modified_at?: string
    download_url?: string
    permalink?: string
    thumbnail_url?: string
    extension?: string
    file_extension?: string
    parent_id?: string
    shared_by?: string
  }
  relationships?: {
    sharedby?: {
      data?: {
        attributes?: {
          display_name?: string
        }
      }
    }
  }
  share_direction?: 'incoming' | 'outgoing'
  is_shared?: boolean
  shared_by?: string
}

export interface ZohoTokenResponse {
  access_token: string
  expires_in: string
  error?: string
}

export interface ZohoUserResponse {
  data?: {
    id?: string
    attributes?: {
      zuid?: string
    }
  }
}

export interface ZohoFilesResponse {
  data?: ZohoApiFile[]
}