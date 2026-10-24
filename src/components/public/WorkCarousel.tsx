import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Play } from 'lucide-react'
import type { WorkProject } from '../../types'
import { cn } from '../../lib/utils'

/** How many cards recede behind the active one on each side. */
const MAX_DEPTH = 3
/** Minimum horizontal travel (px) before a swipe counts as a navigation. */
const SWIPE_THRESHOLD = 44

function pad(value: number) {
  return String(value).padStart(2, '0')
}

/**
 * Maps a raw card distance onto a circular distance so the deck can wrap
 * around the active card without ever leaving a gap.
 */
function wrapOffset(delta: number, total: number) {
  if (total <= 0) return 0
  if (delta > total / 2) return delta - total
  if (delta < -total / 2) return delta + total
  return delta
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  return reduced
}

type WorkCarouselProps = {
  projects: WorkProject[]
  showMeta?: boolean
  onProjectOpen?: (project: WorkProject) => void
}

export function WorkCarousel({
  projects,
  showMeta = true,
  onProjectOpen,
}: WorkCarouselProps) {
  const total = projects.length
  const [active, setActive] = useState(0)
  const [teleports, setTeleports] = useState<number[]>([])
  const reduced = usePrefersReducedMotion()
  const current = projects[active] ?? projects[0]
  const previousOffsets = useRef<number[]>([])
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null)
  const suppressClickUntil = useRef(0)

  const offsets = useMemo(
    () => projects.map((_, index) => wrapOffset(index - active, total)),
    [active, projects, total],
  )

  // Keep the selection valid if the published deck changes length.
  useEffect(() => {
    setActive((value) => (total === 0 ? 0 : Math.min(value, total - 1)))
  }, [total])

  /**
   * When the deck wraps, the card that crosses the seam would otherwise
   * animate across the whole stage. Detect it before paint and snap it
   * into place instead.
   */
  useLayoutEffect(() => {
    const previous = previousOffsets.current
    if (previous.length === offsets.length && !reduced) {
      const wrapped = offsets.reduce<number[]>((hits, value, index) => {
        if (Math.abs(value - previous[index]) > total / 2) hits.push(index)
        return hits
      }, [])
      if (wrapped.length > 0) setTeleports(wrapped)
    }
    previousOffsets.current = offsets
  }, [offsets, reduced, total])

  useEffect(() => {
    if (teleports.length === 0) return
    const timer = window.setTimeout(() => setTeleports([]), 90)
    return () => window.clearTimeout(timer)
  }, [teleports])

  const go = useCallback(
    (delta: number) => {
      if (total === 0) return
      setActive((current) => (current + delta + total) % total)
    },
    [total],
  )

  const goTo = useCallback(
    (index: number) => {
      if (total === 0) return
      setActive(((index % total) + total) % total)
    },
    [total],
  )

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        go(-1)
        break
      case 'ArrowRight':
        event.preventDefault()
        go(1)
        break
      case 'Home':
        event.preventDefault()
        goTo(0)
        break
      case 'End':
        event.preventDefault()
        goTo(total - 1)
        break
      default:
        break
    }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    swipe.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipe.current
    swipe.current = null
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return
    // Prevent the click that follows a swipe from also selecting a side card.
    suppressClickUntil.current = window.performance.now() + 350
    go(dx < 0 ? 1 : -1)
  }

  const handlePointerCancel = () => {
    swipe.current = null
  }

  const selectCard = (index: number) => {
    if (window.performance.now() < suppressClickUntil.current) return
    goTo(index)
  }

  if (total === 0) return null

  return (
    <div
      className="work-carousel"
      role="group"
      aria-roledescription="carousel"
      aria-label="Featured projects"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        className="work-carousel__stage"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className="work-carousel__track">
          {projects.map((project, index) => {
            const offset = offsets[index]
            const depth = Math.min(Math.abs(offset), MAX_DEPTH)
            const isActive = index === active

            return (
              <article
                key={project.id}
                className="work-card"
                data-depth={depth}
                data-active={isActive ? 'true' : 'false'}
                data-teleport={teleports.includes(index) ? 'true' : 'false'}
                style={
                  {
                    '--offset': offset,
                    '--depth': depth,
                    '--side': Math.sign(offset),
                    zIndex: 100 - depth * 10,
                  } as CSSProperties
                }
                aria-hidden={isActive ? undefined : true}
                aria-roledescription="slide"
                aria-label={`${pad(index + 1)} of ${pad(total)}: ${project.title}`}
                role={isActive ? 'button' : undefined}
                tabIndex={isActive ? 0 : -1}
                onClick={(event) => {
                  event.currentTarget.focus()
                  if (window.performance.now() < suppressClickUntil.current) return
                  if (onProjectOpen) onProjectOpen(project)
                  else selectCard(index)
                }}
                onKeyDown={(event) => {
                  if (!isActive || !onProjectOpen) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    event.stopPropagation()
                    onProjectOpen(project)
                  }
                }}
              >
                <div className="work-card__frame">
                  <header className="work-card__header">
                    <div className="work-card__kicker">
                      <span className="work-card__category">
                        <i aria-hidden="true" />
                        {project.category}
                      </span>
                      {project.demo && <span className="work-card__demo">Demo</span>}
                    </div>
                    <h3 className="work-card__title">{project.title}</h3>
                  </header>

                  <div className="work-card__media">
                    <img
                      src={project.cover}
                      alt={
                        project.demo
                          ? `${project.title} — placeholder cover image`
                          : `${project.title} — ${project.category} cover image`
                      }
                      loading={isActive ? 'eager' : 'lazy'}
                      decoding="async"
                      draggable={false}
                    />
                    <span className="work-card__veil" aria-hidden="true" />
                  </div>

                  <span className="work-card__shade" aria-hidden="true" />
                </div>
              </article>
            )
          })}
        </div>

        <button
          type="button"
          className="work-carousel__nav work-carousel__nav--prev"
          onClick={() => go(-1)}
          aria-label="Previous project"
        >
          <ArrowLeft size={19} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className="work-carousel__nav work-carousel__nav--next"
          onClick={() => go(1)}
          aria-label="Next project"
        >
          <ArrowRight size={19} strokeWidth={1.8} />
        </button>
      </div>

      {showMeta && (
        <>
          <div className="work-carousel__bar">
            <p className="work-carousel__count" aria-hidden="true">
              <span>{pad(active + 1)}</span>
              <i />
              <span>{pad(total)}</span>
            </p>

            <div className="work-carousel__dots" role="group" aria-label="Choose a project">
              {projects.map((project, index) => (
                <button
                  key={project.id}
                  type="button"
                  className={cn('work-carousel__dot', index === active && 'is-active')}
                  onClick={() => goTo(index)}
                  aria-current={index === active ? 'true' : undefined}
                  aria-label={`Show project ${pad(index + 1)}: ${project.title}`}
                />
              ))}
            </div>

            <p className="work-carousel__hint" aria-hidden="true">
              Drag or use ← →
            </p>
          </div>

          <div className="work-carousel__info">
            <div className="work-carousel__info-head">
              <p className="eyebrow eyebrow--rule">Now showing</p>
            </div>

            <div className="work-carousel__info-body" aria-live="polite">
              <div className="work-carousel__info-reveal" key={current.id}>
                <div className="work-carousel__info-title">
                  <h3>{current.title}</h3>
                  <p className="work-carousel__info-meta">
                    <span>{current.category}</span>
                    <span>{current.client ?? 'Client credit TBC'}</span>
                  </p>
                </div>

                <div className="work-carousel__info-copy">
                  <p>{current.description}</p>
                  <div className="work-carousel__tags">
                    {current.demo && (
                      <span className="work-carousel__tag work-carousel__tag--demo">
                        Demo content
                      </span>
                    )}
                    {current.services?.map((service) => (
                      <span className="work-carousel__tag" key={service}>
                        {service}
                      </span>
                    ))}
                    {(current.videos?.[0] || current.videoUrl) && (
                      <a
                        className="work-carousel__video"
                        href={current.videos?.[0] || current.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Watch the ${current.title} preview (opens in a new tab)`}
                      >
                        <Play size={13} />
                        Watch preview
                        <ArrowUpRight size={13} />
                      </a>
                    )}
                  </div>
                  {onProjectOpen && (
                    <button
                      type="button"
                      className="work-carousel__project-link"
                      onClick={() => onProjectOpen(current)}
                    >
                      Open project <ArrowUpRight size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
