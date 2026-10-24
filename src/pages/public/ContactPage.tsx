import { ContactDetails, ContactForm } from '../../components/public/ContactForm'

type ContactPageProps = {
  embedded?: boolean
}

export function ContactPage({ embedded = false }: ContactPageProps = {}) {
  const Heading = embedded ? 'h2' : 'h1'

  return (
    <section
      id="contact"
      className={`contact-page${embedded ? ' contact-page--embedded' : ''}`}
      aria-labelledby="contact-title"
    >
      <div className="contact-page__backdrop" aria-hidden="true">
        <img
          className="contact-page__scene"
          src="/images/corporate-gala.jpg"
          alt=""
          width={1600}
          height={1034}
          loading="lazy"
          decoding="async"
        />
        <span className="contact-page__veil" />
      </div>

      <header className="contact-hero">
        <div className="container contact-hero__inner">
          <Heading className="contact-hero__title" id="contact-title">
            Let’s create something <em>extraordinary</em>
          </Heading>
          <span className="contact-hero__accent" aria-hidden="true" />
        </div>
      </header>

      <div className="contact-body">
        <div className="container contact-layout">
          <aside className="contact-layout__info">
            <ContactDetails />
          </aside>
          <div className="contact-layout__form">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  )
}
