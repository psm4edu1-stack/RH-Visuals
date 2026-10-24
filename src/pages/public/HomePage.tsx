import { useEffect, useRef } from 'react'
import { ContactPage } from './ContactPage'
import { ServicesPage } from './ServicesPage'
import { WorkPage } from './WorkPage'

export function HomePage() {
  const stageRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let previousProgress = -1

    const paint = () => {
      frame = 0
      const stageHeight = stage.offsetHeight || window.innerHeight
      const progress = reducedMotion.matches
        ? 0
        : Math.min(1, Math.max(0, window.scrollY / Math.max(stageHeight * 0.86, 1)))

      if (Math.abs(progress - previousProgress) < 0.001) return
      previousProgress = progress
      stage.style.setProperty('--stage-progress', progress.toFixed(4))
    }

    const requestPaint = () => {
      if (frame) return
      frame = window.requestAnimationFrame(paint)
    }

    paint()
    window.addEventListener('scroll', requestPaint, { passive: true })
    window.addEventListener('resize', requestPaint)
    reducedMotion.addEventListener('change', requestPaint)

    return () => {
      window.removeEventListener('scroll', requestPaint)
      window.removeEventListener('resize', requestPaint)
      reducedMotion.removeEventListener('change', requestPaint)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <section
        ref={stageRef}
        id="home"
        className="home-stage"
        aria-label="RH VISUALS concert stage with a wide central LED wall"
      >
        <h1 className="sr-only">RH VISUALS — Live visual production</h1>
        <span className="home-stage__ambient" aria-hidden="true" />
        <div className="home-stage__media" aria-hidden="true">
          <img
            className="home-stage__image"
            src="/images/launch-stage.png"
            alt=""
            width={1875}
            height={839}
            fetchPriority="high"
            decoding="async"
          />
        </div>
        <span className="home-stage__beam" aria-hidden="true" />
        <span className="home-stage__fade" aria-hidden="true" />
      </section>

      <WorkPage embedded />
      <ServicesPage embedded />
      <ContactPage embedded />
    </>
  )
}
