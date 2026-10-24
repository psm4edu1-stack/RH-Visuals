export type ServiceFormat = {
  slug: string
  title: string
  description: string
  image: string
  /** Existing published capability that gives this format its studio detail. */
  capabilitySlug: string
}

/**
 * Presentation catalogue for the public Services page.
 *
 * These are event formats, not fabricated project claims. Live capability
 * records from the API are matched through `capabilitySlug` and supply the
 * expanded scope detail, while the format descriptions stay intentionally
 * general.
 */
export const serviceFormats: ServiceFormat[] = [
  {
    slug: 'nightlife-electronic-music',
    title: 'Nightlife & Electronic Music Culture',
    description:
      'Immersive visual environments for club nights and electronic shows, shaped around the room, the sound and the way a crowd moves.',
    image: '/images/nightlife.jpg',
    capabilitySlug: 'nightlife',
  },
  {
    slug: 'music-festivals',
    title: 'Music Festivals',
    description:
      'Stage content and visual systems for multi-act festival programmes, designed to hold scale while adapting to each artist and set change.',
    image: '/images/festival-lights.jpg',
    capabilitySlug: 'festival-production',
  },
  {
    slug: 'concert-tours-live-shows',
    title: 'Concert Tours & Live Shows',
    description:
      'Tour-ready visual content and playback systems built around the artist, the setlist and the venues on the route.',
    image: '/images/work-pulse.jpg',
    capabilitySlug: 'live-visuals',
  },
  {
    slug: 'nightclub-residencies-guest-sets',
    title: 'Nightclub Residencies & Guest Sets',
    description:
      'A flexible visual language for recurring nights and guest artists, with content that can be refreshed without rebuilding the whole show.',
    image: '/images/work-nocturne.jpg',
    capabilitySlug: 'nightlife',
  },
  {
    slug: 'corporate-commercial-events',
    title: 'Corporate & Commercial Events',
    description:
      'Clear, brand-led visual storytelling for corporate stages, commercial moments and audience-facing presentations.',
    image: '/images/conference.jpg',
    capabilitySlug: 'brand-experiences',
  },
  {
    slug: 'product-launches-technology-expos',
    title: 'Product Launches & Technology Expos',
    description:
      'Stage and screen content that gives a product reveal focus, with spatial treatments that guide attention across the room.',
    image: '/images/brand-launch.jpg',
    capabilitySlug: 'brand-experiences',
  },
  {
    slug: 'award-ceremonies-galas',
    title: 'Award Ceremonies & Galas',
    description:
      'Elegant screen content and stage visual systems for award presentations, galas and formal celebrations.',
    image: '/images/corporate-gala.jpg',
    capabilitySlug: 'brand-experiences',
  },
  {
    slug: 'corporate-meetings-conferences',
    title: 'Corporate Meetings & Conferences',
    description:
      'Readable, composed visual support for keynotes, conferences and leadership moments, built around clarity and pace.',
    image: '/images/about-stage.png',
    capabilitySlug: 'show-design',
  },
  {
    slug: 'fashion-shows-special-events',
    title: 'Fashion Shows & Special Events',
    description:
      'Atmospheric visual design for runways, showcases and one-off events, tuned to the collection, venue and lighting.',
    image: '/images/work-atelier.jpg',
    capabilitySlug: 'projection-mapping',
  },
  {
    slug: 'sports-arenas-half-time-shows',
    title: 'Sports Arenas & Half-Time Shows',
    description:
      'Large-format visual content for arena screens and half-time performances, designed for distance, speed and live camera.',
    image: '/images/work-kinetic.jpg',
    capabilitySlug: 'show-design',
  },
  {
    slug: 'grand-weddings-sangeet',
    title: 'Grand-Scale Weddings & Sangeet',
    description:
      'Personal visual worlds for weddings and sangeet celebrations, balancing cinematic atmosphere with the intimacy of the occasion.',
    image: '/images/hero-confetti.jpg',
    capabilitySlug: 'live-visuals',
  },
]
