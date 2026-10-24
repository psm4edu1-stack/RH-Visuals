import { useRef, useState } from 'react'
import { ImagePlus, LoaderCircle, TriangleAlert } from 'lucide-react'
import { ApiError, api } from '../../lib/api'

export function ImageUploadField({
  label = 'Cover image',
  value,
  onChange,
  hint = 'JPEG, PNG or WebP · up to 5 MB',
  previewFit = 'cover',
}: {
  label?: string
  value: string
  onChange: (url: string) => void
  hint?: string
  previewFit?: 'cover' | 'contain'
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('The image must be 5 MB or smaller.')
      return
    }
    setUploading(true)
    try {
      const result = await api.admin.upload(file)
      onChange(result.upload.url)
    } catch (uploadError) {
      setError(
        uploadError instanceof ApiError
          ? uploadError.message
          : 'The image could not be uploaded.',
      )
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="admin-image-field">
      <span className="admin-image-field__label">{label}</span>
      <div className="admin-image-field__body">
        <div
          className={`admin-image-field__preview admin-image-field__preview--${previewFit}`}
        >
          {value ? (
            <img src={value} alt="" />
          ) : (
            <span>
              <ImagePlus size={22} />
              No image
            </span>
          )}
        </div>
        <div className="admin-image-field__controls">
          <button
            type="button"
            className="btn btn--quiet btn--small"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <LoaderCircle size={15} className="is-spinning" /> : <ImagePlus size={15} />}
            {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <input
            className="admin-image-field__url"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="/uploads/image.jpg or https://…"
            aria-label={`${label} URL`}
          />
          <small>{hint}</small>
          {error && (
            <span className="admin-image-field__error" role="alert">
              <TriangleAlert size={13} /> {error}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
