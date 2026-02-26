export interface SignedUrlOptions {
  expiresInSeconds?: number
  download?: boolean
  downloadFilename?: string
}

export interface ThumbnailOptions {
  width?: number
  height?: number
  fit?: 'cover' | 'contain' | 'inside' | 'outside' | 'fill'
}

export interface FileMetadata {
  size?: number | null
  mime?: string | null
  createdAt?: Date | null
  width?: number | null
  height?: number | null
  pages?: number | null
}

export interface StorageProvider {
  getSignedUrl(path: string, opts?: SignedUrlOptions): Promise<string | null>
  getThumbnailUrl?(path: string, opts?: ThumbnailOptions): Promise<string | null>
  getMetadata?(path: string): Promise<FileMetadata>
  exists?(path: string): Promise<boolean>
}
