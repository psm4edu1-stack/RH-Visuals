import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'
import { SectionLabel } from '../../components/public/SectionLabel'
import { ApiError, api } from '../../lib/api'
import type { WorkProject } from '../../types'
import { NotFoundPage } from './NotFoundPage'

type DetailState = 'loading' | 'ready' | 'not-found' | 'error'

export function ProjectDetailPage() {
  const { slug } = useParams()
  const [project, setProject] = useState<WorkProject | null>(null)
  const [nextProject, setNextProject] = useState<WorkProject | null>(null)
  const [dataState, setDataState] = useState<DetailState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    if (!slug) {
      setDataState('not-found')
      return
    }

    setDataState('loading')
    setErrorMessage('')
    setProject(null)
    setNextProject(null)

    api.public
      .project(slug)
      .then((result) => {
        if (!active) return
        setProject(result.project)
        setDataState('ready')

        // The next-project strip is optional. A failed list request must not
        // hide a project detail that has already loaded successfully.
        api.public
          .projects()
          .then((list) => {
            if (!active) return
            const next = list.projects.find((item) => item.slug !== result.project.slug)
            setNextProject(next ?? null)
          })
          .catch(() => {
            if (active) setNextProject(null)
          })
      })
      .catch((error) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 404) {
          setDataState('not-found')
          return
        }
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'This project could not be loaded.',
        )
        setDataState('error')
      })

    return () => {
      active = false
    }
  }, [slug, reloadKey])

  useEffect(() => {
    if (!project) return
    document.title = `${project.title} — RH VISUALS`
  }, [project])

  if (dataState === 'not-found') return <NotFoundPage />

  if (dataState === 'loading') {
    return (
      <section className="case-state section-pad" aria-busy="true">
        <div className="container">
          <div className="services-state" role="status">
            <LoaderCircle className="spin" size={24} aria-hidden="true" />
            <p className="eyebrow">Case study</p>
            <h1>Loading the project…</h1>
            <p>Reading the published project from the live portfolio.</p>
          </div>
        </div>
      </section>
    )
  }

  if (dataState === 'error' || !project) {
    return (
      <section className="case-state section-pad">
        <div className="container">
          <div className="services-state" role="alert">
            <p className="eyebrow">Case study unavailable</p>
            <h1>The project could not be loaded.</h1>
            <p>{errorMessage || 'The studio portfolio is temporarily unavailable.'}</p>
            <div className="services-state__actions">
              <button
                type="button"
                className="btn btn--quiet btn--small"
                onClick={() => setReloadKey((value) => value + 1)}
              >
                <RefreshCw size={14} aria-hidden="true" /> Try again
              </button>
              <Link to="/#work" className="text-link text-link--light">
                Back to all work
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const gallery = project.gallery.filter(Boolean)
  const heroImage = project.cover || gallery[0]
  const supportingImages = gallery.filter((image) => image !== heroImage)
  const meta = [
    { label: 'Client', value: project.client },
    { label: 'Location', value: project.location },
    { label: 'Scope', value: project.services.slice(0, 2).join(' / ') },
    { label: 'Year', value: project.year },
  ].filter((item) => Boolean(item.value))
  const enquiryHref = project.services[0]
    ? `/?service=${encodeURIComponent(project.services[0])}#contact`
    : '/#contact'

  return (
    <article className="case-study">
      <header className="case-hero">
        <div className="case-hero__media">
          <img src={heroImage} alt={`${project.title} cover image`} />
          <div className="case-hero__veil" />
        </div>
        <div className="container case-hero__inner">
          <Link to="/#work" className="case-back">
            <ArrowLeft size={15} /> All work
          </Link>
          <div className="case-hero__titles">
            <p className="eyebrow">
              {project.category}
              {project.year ? (
                <>
                  {' '}
                  <span>·</span> {project.year}
                </>
              ) : null}
            </p>
            <h1>{project.title}</h1>
          </div>
          {meta.length > 0 && (
            <div className="case-hero__meta">
              {meta.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <section className="case-intro section-pad">
        <div className="container">
          <div className="case-intro__grid">
            <SectionLabel index="01">The project</SectionLabel>
            <div>
              <p className="case-intro__lede reveal">
                {project.description ||
                  'This project is published without a written description. The studio can share the full production notes on request.'}
              </p>
              <Link to={enquiryHref} className="text-link text-link--light reveal">
                Start a similar project <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {supportingImages.length > 0 && (
        <section className="case-gallery">
          <div className="container">
            <div className="case-gallery__main reveal">
              <img
                src={supportingImages[0]}
                alt={`${project.title} production still 1`}
                loading="lazy"
              />
            </div>
            {supportingImages.length > 1 && (
              <div className="case-gallery__grid">
                {supportingImages.slice(1).map((image, index) => (
                  <div className="reveal" key={`${image}-${index}`}>
                    <img
                      src={image}
                      alt={`${project.title} production still ${index + 2}`}
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}
            <p className="case-gallery__caption">
              <span>{project.location || project.category}</span>
              <span>{project.year ? `${project.year} · ` : ''}Production stills</span>
            </p>
          </div>
        </section>
      )}

      <section className="case-outcome section-pad">
        <div className="container case-outcome__grid">
          <div>
            <SectionLabel index="02">Project details</SectionLabel>
            <h2 className="display display--medium reveal">
              Made for
              <br />
              <em>the room.</em>
            </h2>
          </div>
          <div className="case-outcome__copy reveal">
            {project.services.length > 0 && (
              <div className="case-services">
                {project.services.map((service) => (
                  <span key={service}>{service}</span>
                ))}
              </div>
            )}
            <div className="case-outcome__actions">
              {project.videoUrl && (
                <a
                  href={project.videoUrl}
                  className="text-link text-link--light"
                  target="_blank"
                  rel="noreferrer"
                >
                  Watch the preview <ArrowUpRight size={15} />
                </a>
              )}
              <Link to={enquiryHref} className="btn btn--gold">
                Discuss a project <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {nextProject && (
        <section className="next-project">
          <Link to={`/work/${encodeURIComponent(nextProject.slug)}`} className="next-project__link">
            <div className="next-project__media">
              <img src={nextProject.cover} alt="" loading="lazy" />
              <div className="next-project__veil" />
            </div>
            <div className="container next-project__inner">
              <span className="eyebrow">Next project</span>
              <div className="next-project__title">
                <h2>{nextProject.title}</h2>
                <span className="round-link round-link--light">
                  <ArrowRight size={22} />
                </span>
              </div>
              <p>
                {[nextProject.category, nextProject.location, nextProject.year]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </Link>
        </section>
      )}
    </article>
  )
}
