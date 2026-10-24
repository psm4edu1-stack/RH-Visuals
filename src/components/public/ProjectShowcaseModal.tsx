import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Film,
  Images,
  LoaderCircle,
  MapPin,
  Maximize2,
  Play,
  UserRound,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Modal } from '../ui/Overlay'
import { cn } from '../../lib/utils'
import type { WorkProject } from '../../types'

type VideoSource =
  | { kind: 'iframe'; src: string }
  | { kind: 'video'; src: string }
  | { kind: 'link'; src: string }

function parseVideoSource(url: string): VideoSource {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { kind: 'link', src: url }
    }

    const host = parsed.hostname.replace(/^www\./, '')
    const path = parsed.pathname.replace(/\/+$/, '')

    if (host === 'youtu.be') {
      const id = path.slice(1).split('/')[0]
      if (id) {
        return {
          kind: 'iframe',
          src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0`,
        }
      }
    }

    if (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
      const id =
        parsed.searchParams.get('v') ||
        path.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1] ||
        ''
      if (id) {
        return {
          kind: 'iframe',
          src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0`,
        }
      }
    }

    if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
      const id = path.match(/\/(\d+)(?:\/|$)/)?.[1]
      if (id) {
        return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` }
      }
    }

    if (/\.(mp4|webm|ogg|ogv|mov)$/i.test(parsed.pathname)) {
      return { kind: 'video', src: url }
    }
  } catch {
    // Invalid URLs are rendered as a safe external link below.
  }

  return { kind: 'link', src: url }
}

function VideoBlock({ url, title, poster }: { url: string; title: string; poster: string }) {
  const source = parseVideoSource(url)

  if (source.kind === 'iframe') {
    return (
      <div className="project-video__frame">
        <iframe
          src={source.src}
          title={`${title} related video`}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    )
  }

  if (source.kind === 'video') {
    return (
      <video
        className="project-video__native"
        controls
        playsInline
        preload="metadata"
        poster={poster || undefined}
      >
        <source src={source.src} />
        Your browser cannot play this video.
      </video>
    )
  }

  return (
    <div className="project-video__unsupported">
      <Film size={18} aria-hidden="true" />
      <div>
        <strong>This video cannot be embedded.</strong>
        <a href={source.src} target="_blank" rel="noreferrer">
          Open video <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </div>
    </div>
  )
}

export function ProjectShowcaseModal({
  project,
  onClose,
}: {
  project: WorkProject | null
  onClose: () => void
}) {
  const [imageIndex, setImageIndex] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set())
  const lightboxCloseRef = useRef<HTMLButtonElement>(null)
  const lightboxPreviousFocus = useRef<HTMLElement | null>(null)

  const images = useMemo(() => {
    if (!project) return []
    return Array.from(new Set([project.cover, ...(project.gallery ?? [])].filter(Boolean)))
  }, [project])

  const videos = useMemo(() => {
    if (!project) return []
    const related = project.videos?.filter(Boolean) ?? []
    return Array.from(
      new Set(related.length > 0 ? related : project.videoUrl ? [project.videoUrl] : []),
    )
  }, [project])

  useEffect(() => {
    setImageIndex(0)
    setLightboxIndex(null)
    setImageLoaded(false)
    setFailedImages(new Set())
  }, [project?.id])

  useEffect(() => {
    setImageLoaded(false)
  }, [imageIndex, project?.id])

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
    window.setTimeout(() => lightboxPreviousFocus.current?.focus(), 20)
  }, [])

  const openLightbox = (index: number) => {
    lightboxPreviousFocus.current = document.activeElement as HTMLElement
    setLightboxIndex(index)
  }

  useEffect(() => {
    if (lightboxIndex === null) return
    const timer = window.setTimeout(() => lightboxCloseRef.current?.focus(), 20)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeLightbox()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setLightboxIndex((current) =>
          current === null ? null : (current - 1 + images.length) % images.length,
        )
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setLightboxIndex((current) =>
          current === null ? null : (current + 1) % images.length,
        )
      }
      if (event.key !== 'Tab') return
      const focusable = document.querySelectorAll<HTMLElement>(
        '.project-lightbox button, .project-lightbox a[href]',
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [closeLightbox, images.length, lightboxIndex])

  if (!project) {
    return (
      <Modal open={false} onClose={onClose} title="Project">
        <span />
      </Modal>
    )
  }

  const activeImage = images[imageIndex] ?? ''
  const activeImageFailed = failedImages.has(activeImage)
  const categoryMeta = [project.category, project.year].filter(Boolean).join(' · ')
  const locationMeta = [project.client, project.location].filter(Boolean).join(' · ')
  const contactHref = project.services?.[0]
    ? `/?service=${encodeURIComponent(project.services[0])}#contact`
    : '/#contact'

  const goToImage = (nextIndex: number) => {
    if (!images.length) return
    setImageIndex((nextIndex + images.length) % images.length)
  }

  const markFailed = (url: string) => {
    setFailedImages((current) => new Set(current).add(url))
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={project.title}
        eyebrow={categoryMeta || 'Project spotlight'}
        description={locationMeta || undefined}
        size="xl"
        className="project-showcase-modal"
      >
        <div className="project-showcase">
          <div className="project-showcase__media">
            <div className="project-showcase__stage">
              {activeImage && !activeImageFailed ? (
                <button
                  type="button"
                  className="project-showcase__image-button"
                  onClick={() => openLightbox(imageIndex)}
                  aria-label="Open larger image"
                >
                  <img
                    className={cn('project-showcase__image', imageLoaded && 'is-loaded')}
                    src={activeImage}
                    alt={`${project.title} production still ${imageIndex + 1}`}
                    loading="eager"
                    decoding="async"
                    onLoad={() => setImageLoaded(true)}
                    onError={() => markFailed(activeImage)}
                  />
                  {!imageLoaded && (
                    <span className="project-showcase__image-loading" aria-hidden="true">
                      <LoaderCircle className="spin" size={20} />
                    </span>
                  )}
                  <span className="project-showcase__zoom" aria-hidden="true">
                    <Maximize2 size={16} />
                  </span>
                </button>
              ) : (
                <div className="project-media-state">
                  <Images size={24} aria-hidden="true" />
                  <strong>Image unavailable</strong>
                  <span>The project image could not be loaded.</span>
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="project-showcase__nav project-showcase__nav--prev"
                    onClick={() => goToImage(imageIndex - 1)}
                    aria-label="Previous image"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <button
                    type="button"
                    className="project-showcase__nav project-showcase__nav--next"
                    onClick={() => goToImage(imageIndex + 1)}
                    aria-label="Next image"
                  >
                    <ArrowRight size={18} />
                  </button>
                </>
              )}

              {images.length > 1 && (
                <span className="project-showcase__counter">
                  {String(imageIndex + 1).padStart(2, '0')} /{' '}
                  {String(images.length).padStart(2, '0')}
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="project-showcase__thumbs" role="group" aria-label="Project images">
                {images.map((image, index) => (
                  <button
                    type="button"
                    key={`${image}-${index}`}
                    className={cn(
                      'project-showcase__thumb',
                      index === imageIndex && 'is-active',
                      failedImages.has(image) && 'is-unavailable',
                    )}
                    onClick={() => goToImage(index)}
                    aria-label={`Show image ${index + 1}`}
                    aria-current={index === imageIndex ? 'true' : undefined}
                  >
                    {failedImages.has(image) ? (
                      <Images size={15} aria-hidden="true" />
                    ) : (
                      <img
                        src={image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={() => markFailed(image)}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="project-showcase__details">
            <div className="project-showcase__meta">
              {project.client && (
                <span>
                  <UserRound size={13} aria-hidden="true" /> {project.client}
                </span>
              )}
              {project.location && (
                <span>
                  <MapPin size={13} aria-hidden="true" /> {project.location}
                </span>
              )}
              {project.year && (
                <span>
                  <CalendarDays size={13} aria-hidden="true" /> {project.year}
                </span>
              )}
            </div>

            <p className="project-showcase__description">
              {project.description ||
                'This project is published without a written description. The studio can share full production notes on request.'}
            </p>

            {project.services?.length > 0 && (
              <div className="project-showcase__services">
                {project.services.map((service) => (
                  <span key={service}>{service}</span>
                ))}
              </div>
            )}

            {videos.length > 0 && (
              <section className="project-showcase__videos" aria-label="Related videos">
                <div className="project-showcase__section-head">
                  <Film size={15} aria-hidden="true" />
                  <h3>Related video{videos.length === 1 ? '' : 's'}</h3>
                </div>
                <div className="project-video-list">
                  {videos.map((video, index) => (
                    <VideoBlock
                      key={`${video}-${index}`}
                      url={video}
                      title={`${project.title} video ${index + 1}`}
                      poster={project.cover}
                    />
                  ))}
                </div>
              </section>
            )}

            {videos.length === 0 && (
              <div className="project-showcase__no-video">
                <Play size={15} aria-hidden="true" />
                <span>No related video has been published for this project yet.</span>
              </div>
            )}

            <div className="project-showcase__actions">
              <Link to={contactHref} className="btn btn--gold" onClick={onClose}>
                Discuss a similar project <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </Modal>

      {lightboxIndex !== null &&
        createPortal(
          <div
            className="project-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`${project.title} image viewer`}
            onClick={closeLightbox}
          >
            <button
              ref={lightboxCloseRef}
              type="button"
              className="project-lightbox__close"
              onClick={closeLightbox}
              aria-label="Close image viewer"
            >
              <X size={20} />
            </button>

            {images.length > 1 && (
              <button
                type="button"
                className="project-lightbox__nav project-lightbox__nav--prev"
                onClick={(event) => {
                  event.stopPropagation()
                  setLightboxIndex(
                    (lightboxIndex - 1 + images.length) % images.length,
                  )
                }}
                aria-label="Previous image"
              >
                <ArrowLeft size={22} />
              </button>
            )}

            <figure className="project-lightbox__figure" onClick={(event) => event.stopPropagation()}>
              <img
                src={images[lightboxIndex]}
                alt={`${project.title} full-size image ${lightboxIndex + 1}`}
              />
              <figcaption>
                {project.title}
                <span>
                  {lightboxIndex + 1} / {images.length}
                </span>
              </figcaption>
            </figure>

            {images.length > 1 && (
              <button
                type="button"
                className="project-lightbox__nav project-lightbox__nav--next"
                onClick={(event) => {
                  event.stopPropagation()
                  setLightboxIndex((lightboxIndex + 1) % images.length)
                }}
                aria-label="Next image"
              >
                <ArrowRight size={22} />
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
