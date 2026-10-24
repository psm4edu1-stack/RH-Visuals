import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Clapperboard, LoaderCircle, RefreshCw } from 'lucide-react'
import { ProjectShowcaseModal } from '../../components/public/ProjectShowcaseModal'
import { SplitHeading } from '../../components/public/SplitHeading'
import { WorkCarousel } from '../../components/public/WorkCarousel'
import { useInView } from '../../hooks/useInView'
import { ApiError, api } from '../../lib/api'
import { PUBLIC_CONTENT_UPDATED_EVENT } from '../../lib/publicContentEvents'
import type { WorkProject } from '../../types'

type WorkLoadState = 'loading' | 'ready' | 'error'

type WorkPageProps = {
  embedded?: boolean
}

export function WorkPage({ embedded = false }: WorkPageProps) {
  const [projects, setProjects] = useState<WorkProject[]>([])
  const [dataState, setDataState] = useState<WorkLoadState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const hasProjectsRef = useRef(false)
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )
  const closeProject = useCallback(() => setSelectedProjectId(null), [])
  const { ref: sectionRef, inView } = useInView<HTMLElement>({
    threshold: 0.08,
    rootMargin: '0px 0px -10% 0px',
  })

  useEffect(() => {
    hasProjectsRef.current = projects.length > 0
  }, [projects.length])

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setDataState('loading')
      setErrorMessage('')
    }

    try {
      const result = await api.public.projects()
      setProjects(result.projects)
      setDataState('ready')
      setErrorMessage('')
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Published work could not be loaded.'

      // A background refresh must not replace a working portfolio with an
      // error screen or unmount the carousel while a visitor is browsing.
      if (silent && hasProjectsRef.current) return

      setProjects([])
      setErrorMessage(message)
      setDataState('error')
    }
  }, [])

  useEffect(() => {
    void load(false)
  }, [load])

  useEffect(() => {
    if (dataState === 'ready' && selectedProjectId && !selectedProject) {
      setSelectedProjectId(null)
    }
  }, [dataState, selectedProjectId, selectedProject])

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
    <div className={`work-page${embedded ? ' work-page--embedded' : ''}`}>
      <div className="work-page__backdrop" aria-hidden="true">
        <img
          className="work-page__scene"
          src="/images/work-kinetic.jpg"
          alt=""
          width={1600}
          height={1067}
          loading="lazy"
          decoding="async"
        />
        <span className="work-page__veil" />
      </div>

      <section
        ref={sectionRef}
        id="work"
        className="work-showcase"
        aria-labelledby="work-showcase-title"
      >
        <div
          className={`container work-showcase__inner${inView ? ' is-inview' : ''}`}
        >
          <header className="work-page__heading">
            <SplitHeading
              as={embedded ? 'h2' : 'h1'}
              id="work-showcase-title"
              className="work-page__title"
              left="Our"
              right="Works"
              active={inView}
            />
            <span className="work-page__title-accent" aria-hidden="true" />
          </header>

          <div aria-busy={dataState === 'loading'}>
            {dataState === 'loading' && (
              <div className="services-state work-data-state" role="status">
                <LoaderCircle className="spin" size={24} aria-hidden="true" />
                <p className="eyebrow">Portfolio</p>
                <h2>Loading the published work…</h2>
                <p>The studio portfolio is being read from the live database.</p>
              </div>
            )}

            {dataState === 'error' && (
              <div className="services-state work-data-state" role="alert">
                <Clapperboard size={24} aria-hidden="true" />
                <p className="eyebrow">Portfolio unavailable</p>
                <h2>The work could not be loaded.</h2>
                <p>{errorMessage}</p>
                <div className="services-state__actions">
                  <button
                    type="button"
                    className="btn btn--quiet btn--small"
                    onClick={() => void load(false)}
                  >
                    <RefreshCw size={14} aria-hidden="true" /> Try again
                  </button>
                </div>
              </div>
            )}

            {dataState === 'ready' && projects.length === 0 && (
              <div className="services-state work-data-state">
                <Clapperboard size={24} aria-hidden="true" />
                <p className="eyebrow">Portfolio</p>
                <h2>The next frame is in production.</h2>
                <p>
                  No published projects are available yet. Once the studio publishes a
                  project in the admin portfolio, it will appear here automatically.
                </p>
              </div>
            )}

            {dataState === 'ready' && projects.length > 0 && (
              <WorkCarousel
                projects={projects}
                onProjectOpen={(project) => setSelectedProjectId(project.id)}
              />
            )}
          </div>
        </div>
      </section>

      <ProjectShowcaseModal project={selectedProject} onClose={closeProject} />
    </div>
  )
}
