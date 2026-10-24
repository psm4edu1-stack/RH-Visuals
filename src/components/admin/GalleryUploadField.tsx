import { useRef, useState } from 'react'
import {
  ImagePlus,
  Link2,
  LoaderCircle,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { ApiError, api } from '../../lib/api'

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxFileSize = 5 * 1024 * 1024

export function GalleryUploadField({
  label = 'Gallery images',
  value,
  onChange,
  hint = 'JPEG, PNG or WebP · up to 5 MB each · maximum 20 images',
}: {
  label?: string
  value: string[]
  onChange: (urls: string[]) => void
  hint?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [urlDraft, setUrlDraft] = useState('')

  const handleFiles = async (fileList: FileList | undefined) => {
    const files = Array.from(fileList ?? [])
    if (!files.length) return
    setError('')

    const invalid = files.find(
      (file) => !allowedTypes.includes(file.type) || file.size > maxFileSize,
    )
    if (invalid) {
      setError(
        `${invalid.name} is not a supported image. Choose JPEG, PNG or WebP files up to 5 MB each.`,
      )
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    if (value.length + files.length > 20) {
      setError('A project can hold up to 20 gallery images.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setUploading(true)
    const uploaded: string[] = []
    try {
      for (let index = 0; index < files.length; index += 1) {
        setProgress(`Uploading ${index + 1} of ${files.length}…`)
        const result = await api.admin.upload(files[index])
        uploaded.push(result.upload.url)
      }
      if (uploaded.length > 0) onChange([...value, ...uploaded])
      setProgress('')
    } catch (uploadError) {
      if (uploaded.length > 0) onChange([...value, ...uploaded])
      setError(
        uploadError instanceof ApiError
          ? uploadError.message
          : 'The gallery image could not be uploaded.',
      )
    } finally {
      setUploading(false)
      setProgress('')
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const addUrl = () => {
    const next = urlDraft.trim()
    if (!next) return
    if (value.includes(next)) {
      setUrlDraft('')
      return
    }
    if (value.length >= 20) {
      setError('A project can hold up to 20 gallery images.')
      return
    }
    onChange([...value, next])
    setUrlDraft('')
    setError('')
  }

  const remove = (url: string) => {
    onChange(value.filter((item) => item !== url))
    setError('')
  }

  return (
    <div className="admin-gallery-field">
      <div className="admin-gallery-field__heading">
        <span className="admin-image-field__label">{label}</span>
        <small>{value.length} / 20 images</small>
      </div>

      {value.length > 0 ? (
        <div className="admin-gallery-field__grid">
          {value.map((url, index) => (
            <figure className="admin-gallery-field__item" key={`${url}-${index}`}>
              <img src={url} alt={`Gallery image ${index + 1}`} />
              <button
                type="button"
                className="admin-gallery-field__remove"
                onClick={() => remove(url)}
                title="Remove gallery image"
                aria-label={`Remove gallery image ${index + 1}`}
              >
                <Trash2 size={13} />
              </button>
            </figure>
          ))}
        </div>
      ) : (
        <div className="admin-gallery-field__empty">
          <ImagePlus size={19} aria-hidden="true" />
          <span>No gallery images uploaded yet.</span>
        </div>
      )}

      <div className="admin-gallery-field__actions">
        <button
          type="button"
          className="btn btn--quiet btn--small"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <LoaderCircle size={15} className="is-spinning" /> : <ImagePlus size={15} />}
          {uploading ? progress || 'Uploading…' : 'Upload images'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(event) => void handleFiles(event.target.files ?? undefined)}
        />
        <span className="admin-gallery-field__hint">{hint}</span>
      </div>

      <div className="admin-gallery-field__url">
        <input
          value={urlDraft}
          onChange={(event) => setUrlDraft(event.target.value)}
          placeholder="/uploads/image.jpg or https://…"
          aria-label="Gallery image URL"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addUrl()
            }
          }}
        />
        <button
          type="button"
          className="btn btn--quiet btn--small"
          onClick={addUrl}
          disabled={!urlDraft.trim()}
        >
          <Link2 size={14} /> Add URL
        </button>
      </div>

      {error && (
        <span className="admin-image-field__error" role="alert">
          <TriangleAlert size={13} /> {error}
        </span>
      )}
    </div>
  )
}
