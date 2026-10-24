import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  return (
    <section className="not-found">
      <div className="not-found__grid" aria-hidden="true" />
      <div className="container not-found__inner">
        <p className="eyebrow">404 · Out of cue</p>
        <h1>
          This moment<br />
          isn’t on <em>the call sheet.</em>
        </h1>
        <p>
          The page you’re looking for may have moved, or the link has drifted out of
          sync. The show is still going.
        </p>
        <div className="not-found__actions">
          <Link to="/" className="btn btn--gold">
            <ArrowLeft size={16} /> Back to the studio
          </Link>
          <Link to="/work" className="text-link text-link--light">
            Browse the work
          </Link>
        </div>
      </div>
    </section>
  )
}
