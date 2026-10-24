import { useEffect, useState, type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/utils'

export function PageMasthead({
  eyebrow,
  title,
  intro,
  meta,
  image,
  children,
  compact = false,
}: {
  eyebrow: string
  title: ReactNode
  intro?: string
  meta?: { label: string; value: string }[]
  image?: string
  children?: ReactNode
  compact?: boolean
}) {
  return (
    <header className={cn('page-masthead', compact && 'page-masthead--compact')}>
      {image && (
        <div className="page-masthead__media" aria-hidden="true">
          <img src={image} alt="" />
          <div className="page-masthead__media-veil" />
        </div>
      )}
      <div className="page-masthead__grid" aria-hidden="true" />
      <div className="container page-masthead__inner">
        <p className="eyebrow eyebrow--rule">{eyebrow}</p>
        <h1>{title}</h1>
        <div className="page-masthead__bottom">
          {intro && <p className="page-masthead__intro">{intro}</p>}
          {meta && (
            <dl className="page-masthead__meta">
              {meta.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {children}
      </div>
    </header>
  )
}

export function TestimonialCarousel({
  testimonials,
}: {
  testimonials: { quote: string; name: string; role: string; project: string }[]
}) {
  const [active, setActive] = useState(0)
  const current = testimonials[active]

  useEffect(() => {
    if (active > testimonials.length - 1) setActive(0)
  }, [active, testimonials.length])

  return (
    <div className="testimonial-carousel">
      <div className="testimonial-mark" aria-hidden="true">
        “
      </div>
      <blockquote key={active}>{current.quote}</blockquote>
      <div className="testimonial-carousel__footer">
        <div className="testimonial-person">
          <span className="testimonial-person__line" />
          <div>
            <strong>{current.name}</strong>
            <span>{current.role}</span>
          </div>
        </div>
        <div className="testimonial-controls">
          <span className="testimonial-count">
            {String(active + 1).padStart(2, '0')} / {String(testimonials.length).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => setActive((currentIndex) => (currentIndex - 1 + testimonials.length) % testimonials.length)}
            aria-label="Previous testimonial"
          >
            <ArrowDownRight size={19} />
          </button>
          <button
            type="button"
            onClick={() => setActive((currentIndex) => (currentIndex + 1) % testimonials.length)}
            aria-label="Next testimonial"
          >
            <ArrowUpRight size={19} />
          </button>
        </div>
      </div>
    </div>
  )
}
