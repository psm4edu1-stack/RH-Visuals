import { Link } from 'react-router-dom'
import { ArrowUpRight, CircleDot, Crosshair, Users } from 'lucide-react'
import { PageMasthead } from '../../components/public/PageElements'
import { SectionLabel } from '../../components/public/SectionLabel'
import { studioStats } from '../../data/publicContent'

const principles = [
  {
    icon: CircleDot,
    number: '01',
    title: 'Feeling before effect',
    copy: 'A visual only earns its place if it makes the moment clearer, stranger or more alive. We choose intention over decoration every time.',
  },
  {
    icon: Crosshair,
    number: '02',
    title: 'Built for the room',
    copy: 'A frame on a monitor means nothing in a room with bad sightlines and three tonnes of haze. We design inside the real conditions.',
  },
  {
    icon: Users,
    number: '03',
    title: 'One accountable team',
    copy: 'The person who hears the brief is in the room when it plays. Fewer handoffs, more ownership, and no one waiting for someone else.',
  },
]

const timeline = [
  { year: '2017', title: 'A projector and a borrowed roof', copy: 'RH VISUALS begins with a single architectural projection in Chennai.' },
  { year: '2020', title: 'The touring years', copy: 'First national tour content system, then three more. The studio learns to build for the road.' },
  { year: '2023', title: 'Festival scale', copy: 'Lumen Fields marks the studio’s first three-stage festival visual production.' },
  { year: '2026', title: 'A wider room', copy: 'Productions across India, Singapore and Dubai. Still small. Still senior. Still here for the goosebumps.' },
]

const people = [
  { name: 'Rhian Hale', role: 'Founder & Creative Director', focus: 'Direction · Client partnership' },
  { name: 'Meera Varghese', role: 'Executive Producer', focus: 'Production · Delivery' },
  { name: 'Aditya Rao', role: 'Technical Director', focus: 'Systems · Show control' },
  { name: 'Zoya Khan', role: 'Content & Motion Lead', focus: 'Design · Motion' },
]

export function AboutPage() {
  return (
    <div className="about-page">
      <PageMasthead
        eyebrow="The studio · Since 2017"
        title={
          <>
            Small studio.
            <br />
            Senior hands. <em>Big rooms.</em>
          </>
        }
        intro="RH VISUALS is a live visual production studio built around a simple belief: people remember how a room made them feel, not how many pixels it had."
        meta={[
          { label: 'Based in', value: 'Chennai, India' },
          { label: 'Team', value: '6 core + trusted network' },
          { label: 'Working', value: 'Worldwide' },
        ]}
      />

      <section className="about-story section-pad">
        <div className="container">
          <div className="about-story__top">
            <SectionLabel index="01">Our story</SectionLabel>
            <div>
              <h2 className="display display--large reveal">
                We started with a question: what makes a room <em>lean in?</em>
              </h2>
            </div>
          </div>
          <div className="about-story__grid">
            <div className="about-story__media reveal">
              <img
                src="/images/about-stage.png"
                alt="Atmospheric stage lighting above a live audience"
                loading="lazy"
              />
              <div className="about-story__media-caption">
                <span>Chennai, India</span>
                <span>Studio archive · 2026</span>
              </div>
            </div>
            <div className="about-story__copy">
              <p className="about-story__lead reveal">
                Nine years ago, we projected a set of hand-painted light studies onto the
                side of a building in Chennai. There was no brief, no budget and no
                promise anyone would look. But people stopped.
              </p>
              <p className="reveal">
                That pause is still the work. The screens have become bigger and the
                rooms more complicated, but the intention hasn’t changed: make something
                that lands in a body before it is understood in a head.
              </p>
              <p className="reveal">
                Today the studio moves between concert arenas, festival fields, hotel
                ballrooms and warehouse launches. The scale changes what we build, never
                why. We stay deliberately compact so the people in the first conversation
                are still there when the last cue goes out.
              </p>
              <div className="about-signature reveal">
                <span>Rhian Hale</span>
                <small>Founder & Creative Director</small>
              </div>
            </div>
          </div>

          <div className="about-stats">
            {studioStats.map((stat, index) => (
              <div className="about-stat reveal" key={stat.label} style={{ transitionDelay: `${index * 60}ms` }}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="principles-section section-pad">
        <div className="container">
          <div className="principles-section__heading">
            <SectionLabel index="02">How we think</SectionLabel>
            <h2 className="display display--medium reveal">
              Three principles.<br />
              <em>Every project.</em>
            </h2>
          </div>
          <div className="principles-grid">
            {principles.map((principle, index) => {
              const Icon = principle.icon
              return (
                <article
                  className="principle reveal"
                  key={principle.number}
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  <div className="principle__top">
                    <Icon size={22} strokeWidth={1.4} />
                    <span>{principle.number}</span>
                  </div>
                  <h3>{principle.title}</h3>
                  <p>{principle.copy}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="timeline-section section-pad">
        <div className="container">
          <div className="timeline-section__heading">
            <SectionLabel index="03">A short history</SectionLabel>
            <p className="eyebrow">2017 — now</p>
          </div>
          <div className="timeline">
            {timeline.map((item) => (
              <article className="timeline__item reveal" key={item.year}>
                <span className="timeline__year">{item.year}</span>
                <div className="timeline__marker" />
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="people-section section-pad">
        <div className="container people-section__grid">
          <div>
            <SectionLabel index="04">The people</SectionLabel>
            <h2 className="display display--medium reveal">
              The room is<br />
              only as good as<br />
              <em>the hands on it.</em>
            </h2>
            <p className="people-section__intro reveal">
              A core team of producers, designers and technicians, supported by a
              trusted network of specialists across cities. Everyone has a seat at the
              creative table; everyone knows what happens at cue 47.
            </p>
          </div>
          <div className="people-list">
            {people.map((person, index) => (
              <div className="person-row reveal" key={person.name} style={{ transitionDelay: `${index * 60}ms` }}>
                <span className="person-row__index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{person.name}</strong>
                  <span>{person.role}</span>
                </div>
                <small>{person.focus}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-cta">
        <div className="container about-cta__inner">
          <p className="eyebrow">The next chapter</p>
          <h2 className="display">
            Maybe it starts with <em>your room.</em>
          </h2>
          <div>
            <Link to="/contact" className="btn btn--gold">
              Start a conversation <ArrowUpRight size={16} />
            </Link>
            <Link to="/work" className="text-link text-link--light">
              See the work
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
