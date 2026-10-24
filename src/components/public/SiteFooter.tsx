import { Link } from 'react-router-dom'
import { ArrowUpRight, Instagram, Linkedin } from 'lucide-react'
import { BrandLogo } from '../ui/BrandLogo'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__top">
        <div className="site-footer__intro">
          <BrandLogo />
          <p>Live visual production for rooms that deserve to be remembered.</p>
          <span className="availability">
            <span className="availability__dot" />
            Booking Nov 2026 — Apr 2027
          </span>
        </div>
        <div className="site-footer__links">
          <div>
            <p className="footer-label">Explore</p>
            <Link to="/#work">Work</Link>
            <Link to="/#services">Services</Link>
            <Link to="/studio">Studio</Link>
            <Link to="/#contact">Contact</Link>
          </div>
          <div>
            <p className="footer-label">Connect</p>
            <a href="mailto:hello@rhvisuals.studio">Email the studio</a>
            <a href="tel:+919840021644">+91 98400 21644</a>
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noreferrer"
              className="footer-social"
            >
              <Instagram size={14} /> Instagram
            </a>
            <a
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noreferrer"
              className="footer-social"
            >
              <Linkedin size={14} /> LinkedIn
            </a>
          </div>
          <div>
            <p className="footer-label">Studio</p>
            <span>Chennai, India</span>
            <span>Working worldwide</span>
            <Link to="/admin" className="footer-studio-link">
              Studio OS <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>
      <div className="site-footer__wordmark" aria-hidden="true">
        RH<span>V</span>
      </div>
      <div className="site-footer__bottom">
        <span>© {new Date().getFullYear()} RH VISUALS. All rights reserved.</span>
        <span>Built for the moment it happens.</span>
        <span>Chennai · 13.0827° N, 80.2707° E</span>
      </div>
    </footer>
  )
}
