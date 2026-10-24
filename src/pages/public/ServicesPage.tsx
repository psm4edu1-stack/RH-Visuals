import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ChevronDown, Layers3, LoaderCircle, RefreshCw } from 'lucide-react'
import { SplitHeading } from '../../components/public/SplitHeading'
import { useInView } from '../../hooks/useInView'
import { ApiError, api } from '../../lib/api'
import { PUBLIC_CONTENT_UPDATED_EVENT } from '../../lib/publicContentEvents'
import type { AdminService } from '../../types'

type ServiceLoadState = 'loading' | 'ready' | 'error'

type ServicesPageProps = {
  embedded?: boolean
}

function serviceSummary(service: AdminService) {
  if (service.short.trim()) return service.short
  const description = service.description.trim()
  if (!description) return 'A studio capability shaped around the brief, the room and the audience.'
  const firstSentence = description.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim()
  return firstSentence || description.slice(0, 180)
}

export function ServicesPage({ embedded = false }: ServicesPageProps = {}) {
  const [serviceList, setServiceList] = useState<AdminService[]>([])
  const [dataState, setDataState] = useState<ServiceLoadState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const hasServicesRef = useRef(false)
  const { ref: heroRef, inView: heroInView } = useInView<HTMLElement>({
    threshold: 0.18,
  })
  const { ref: gridRef, inView: gridInView } = useInView<HTMLDivElement>({
    threshold: 0.04,
    rootMargin: '0px 0px -10% 0px',
  })

  useEffect(() => {
    hasServicesRef.current = serviceList.length > 0
  }, [serviceList.length])

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setDataState('loading')
      setErrorMessage('')
      setExpandedId(null)
    }

    try {
      const result = await api.public.services()
      setServiceList(result.services)
      setDataState('ready')
      setErrorMessage('')
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Published services could not be loaded.'

      if (silent && hasServicesRef.current) return

      setServiceList([])
      setErrorMessage(message)
      setDataState('error')
    }
  }, [])

  useEffect(() => {
    void load(false)
  }, [load])

  useEffect(() => {
    const refresh = () => {
      void load(true)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    window.addEventListener('focus', refresh)
    window.addEventListener(PUBLIC_CONTENT_UPDATED_EVENT, refresh)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener(PUBLIC_CONTENT_UPDATED_EVENT, refresh)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [load])

  return (
    <section
      id="services"
      className={`services-page${embedded ? ' services-page--embedded' : ''}`}
      aria-labelledby="services-title"
    >
      <div className="services-page__backdrop" aria-hidden="true">
        <img
          className="services-page__scene"
          src="/images/about-stage.png"
          alt=""
          width={1920}
          height={1080}
          loading="lazy"
          decoding="async"
        />
        <span className="services-page__veil" />
      </div>

      <header
        ref={heroRef}
        className={`services-hero${heroInView ? ' is-inview' : ''}`}
      >
        <div className="container services-hero__inner">
          <SplitHeading
            as={embedded ? 'h2' : 'h1'}
            id="services-title"
            className="services-page__title"
            left="Our"
            right="Services"
            active={heroInView}
          />
          <span className="services-page__title-accent" aria-hidden="true" />
        </div>
      </header>

      <div
        id="services-catalogue"
        className="services-catalogue"
        aria-busy={dataState === 'loading'}
      >
        <div className="container">
          <div ref={gridRef}>
          {dataState === 'loading' && (
            <div className="services-grid is-inview" aria-hidden="true">
              {[0, 1, 2].map((index) => (
                <div className="service-card service-card--skeleton" key={index}>
                  <div className="service-card__skeleton-media" />
                  <div className="service-card__skeleton-body">
                    <span className="service-card__skeleton-line service-card__skeleton-line--short" />
                    <span className="service-card__skeleton-line service-card__skeleton-line--medium" />
                    <span className="service-card__skeleton-line" />
                    <span className="service-card__skeleton-line" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {dataState === 'error' && (
            <div className="services-state" role="alert">
              <Layers3 size={24} aria-hidden="true" />
              <p className="eyebrow">Capabilities</p>
              <h2>The service catalogue could not be loaded.</h2>
              <p>{errorMessage}</p>
              <div className="services-state__actions">
                <button
                  type="button"
                  className="btn btn--quiet btn--small"
                  onClick={() => void load(false)}
                >
                  <RefreshCw size={14} aria-hidden="true" /> Try again
                </button>
                <Link to="/#contact" className="text-link text-link--light">
                  Talk to a producer <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          )}

          {dataState === 'ready' && serviceList.length === 0 && (
            <div className="services-state">
              <Layers3 size={24} aria-hidden="true" />
              <p className="eyebrow">Capabilities</p>
              <h2>The service catalogue is being prepared.</h2>
              <p>
                No published services are available yet. When the studio publishes a
                service in the admin panel, it will appear here automatically.
              </p>
              <div className="services-state__actions">
                <Link to="/#contact" className="btn btn--quiet btn--small">
                  Start a conversation <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          )}

          {dataState === 'ready' && serviceList.length > 0 && (
            <div className={`services-grid${gridInView ? ' is-inview' : ''}`}>
              {serviceList.map((service, index) => {
                const isOpen = expandedId === service.id
                const detailsId = `service-details-${service.id}`
                const deliverables = Array.isArray(service.deliverables)
                  ? service.deliverables
                  : []
                const hasDetails =
                  Boolean(service.description?.trim()) || deliverables.length > 0

                return (
                  <article
                    className={`service-card${index === 0 ? ' service-card--featured' : ''}${
                      isOpen ? ' is-open' : ''
                    }`}
                    id={service.slug}
                    key={service.id}
                    style={{ '--service-index': Math.min(index, 7) } as CSSProperties}
                  >
                    <div className="service-card__media">
                      <img
                        src={service.image}
                        alt={`${service.title} — RH VISUALS`}
                        loading={index < 3 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                    </div>

                    <div className="service-card__body">
                      <h2 className="service-card__title">{service.title}</h2>
                      <p className="service-card__short">{serviceSummary(service)}</p>

                      {hasDetails && (
                        <button
                          type="button"
                          className="service-card__toggle"
                          aria-expanded={isOpen}
                          aria-controls={detailsId}
                          onClick={() =>
                            setExpandedId((current) =>
                              current === service.id ? null : service.id,
                            )
                          }
                        >
                          {isOpen ? 'Hide scope' : 'View scope'}
                          <ChevronDown size={14} aria-hidden="true" />
                        </button>
                      )}

                      <div
                        className="service-card__details"
                        id={detailsId}
                        role="region"
                        aria-label={`${service.title} scope`}
                        hidden={!isOpen}
                      >
                        <p className="service-card__details-label">Studio capability</p>
                        {service.description?.trim() && <p>{service.description}</p>}
                        {deliverables.length > 0 && (
                          <ul className="service-card__deliverables">
                            {deliverables.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {service.startingAt?.trim() && (
                        <p className="service-card__investment">
                          <span>Starting point</span>
                          <strong>{service.startingAt}</strong>
                        </p>
                      )}
                    </div>

                    <div className="service-card__footer">
                      <Link
                        to={`/?service=${encodeURIComponent(service.title)}#contact`}
                        className="service-card__cta"
                        aria-label={`Discuss a project for ${service.title}`}
                      >
                        Discuss your project <ArrowUpRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {dataState === 'loading' && (
            <p className="service-data-state" role="status">
              <LoaderCircle className="spin" size={13} aria-hidden="true" /> Loading
              published services…
            </p>
          )}
          </div>
        </div>
      </div>
    </section>
  )
}
