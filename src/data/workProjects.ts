import type { WorkProject } from '../types'

const demoUpdatedAt = '2025-12-01T00:00:00.000Z'

/**
 * DEMO WORK PAGE DATA
 * -------------------
 * These records exist only to demonstrate the Work page layout and carousel
 * interactions. Titles, copy and credits are intentionally marked as demo
 * content and must be replaced with confirmed productions before launch.
 *
 * The shape matches the future published-project payload (id, media, ordering
 * and publish state), so this module can later be swapped for a database/API
 * query without touching the carousel component.
 */
export const demoWorkProjects: WorkProject[] = [
  {
    id: 'demo-01',
    slug: 'demo-festival-main-stage',
    title: 'Demo 01 · Festival Main Stage',
    description:
      'Placeholder project for a festival main-stage build. The final entry will carry the confirmed concept, stage system and production credits once the real work is cleared for publication.',
    category: 'Festival',
    cover: '/images/work-horizon.jpg',
    gallery: ['/images/work-horizon.jpg', '/images/hero-crowd.jpg', '/images/festival-lights.jpg'],
    client: 'Client credit TBC',
    location: 'Venue TBC',
    services: ['Live visuals', 'Show design'],
    order: 1,
    status: 'published',
    updatedAt: demoUpdatedAt,
    demo: true,
    accent: '#F15B40',
  },
  {
    id: 'demo-02',
    slug: 'demo-arena-tour',
    title: 'Demo 02 · Arena Tour',
    description:
      'Placeholder project for a touring arena show. Replace this copy with the confirmed artist, venue scale and visual system when the project is ready to publish.',
    category: 'Live Music',
    cover: '/images/festival-lights.jpg',
    gallery: ['/images/festival-lights.jpg', '/images/work-pulse.jpg', '/images/performance.jpg'],
    client: 'Client credit TBC',
    location: 'Venue TBC',
    services: ['Tour content', 'LED systems'],
    order: 2,
    status: 'published',
    updatedAt: demoUpdatedAt,
    demo: true,
    accent: '#FFC928',
  },
  {
    id: 'demo-03',
    slug: 'demo-club-series',
    title: 'Demo 03 · Club Series',
    description:
      'Placeholder project for a recurring club series. The final entry will document the generative system, room layout and resident operation behind the visuals.',
    category: 'Nightlife',
    cover: '/images/nightlife.jpg',
    gallery: ['/images/nightlife.jpg', '/images/work-nocturne.jpg', '/images/work-atelier.jpg'],
    client: 'Client credit TBC',
    location: 'Venue TBC',
    services: ['Generative visuals', 'Venue identity'],
    order: 3,
    status: 'published',
    updatedAt: demoUpdatedAt,
    demo: true,
    accent: '#7541A8',
  },
  {
    id: 'demo-04',
    slug: 'demo-leadership-summit',
    title: 'Demo 04 · Leadership Summit',
    description:
      'Placeholder project for a leadership summit. Use this space for the confirmed brief, keynote system and technical delivery once the event is approved for the portfolio.',
    category: 'Corporate',
    cover: '/images/conference.jpg',
    gallery: ['/images/conference.jpg', '/images/corporate-gala.jpg', '/images/about-stage.png'],
    client: 'Client credit TBC',
    location: 'Venue TBC',
    services: ['Keynote graphics', 'Show operation'],
    order: 4,
    status: 'published',
    updatedAt: demoUpdatedAt,
    demo: true,
    accent: '#A0A0B2',
  },
  {
    id: 'demo-05',
    slug: 'demo-product-reveal',
    title: 'Demo 05 · Product Reveal',
    description:
      'Placeholder project for a product reveal. The published version will describe the spatial concept, content design and guest experience in the studio’s own words.',
    category: 'Brand Experience',
    cover: '/images/brand-launch.jpg',
    gallery: ['/images/brand-launch.jpg', '/images/hero-confetti.jpg', '/images/work-atelier.jpg'],
    client: 'Client credit TBC',
    location: 'Venue TBC',
    services: ['Projection', 'Spatial content'],
    order: 5,
    status: 'published',
    updatedAt: demoUpdatedAt,
    demo: true,
    accent: '#C9856C',
  },
  {
    id: 'demo-06',
    slug: 'demo-gala-dinner',
    title: 'Demo 06 · Gala Dinner',
    description:
      'Placeholder project for a gala dinner. Replace this entry with confirmed staging, screen content and production credits when the project clears review.',
    category: 'Corporate',
    cover: '/images/corporate-gala.jpg',
    gallery: ['/images/corporate-gala.jpg', '/images/about-stage.png', '/images/hero-confetti.jpg'],
    client: 'Client credit TBC',
    location: 'Venue TBC',
    services: ['Stage content', 'Guest experience'],
    order: 6,
    status: 'published',
    updatedAt: demoUpdatedAt,
    demo: true,
    accent: '#8B6BB1',
  },
  {
    id: 'demo-07',
    slug: 'demo-draft-preview',
    title: 'Demo 07 · Draft Preview',
    description:
      'Draft entry kept out of the public deck. It demonstrates how unpublished projects are filtered from the Work page until an admin publishes them.',
    category: 'Festival',
    cover: '/images/work-kinetic.jpg',
    gallery: ['/images/work-kinetic.jpg'],
    client: 'Client credit TBC',
    location: 'Venue TBC',
    services: ['Draft preview'],
    order: 7,
    status: 'draft',
    updatedAt: demoUpdatedAt,
    demo: true,
    accent: '#F15B40',
  },
]

/**
 * Public Work page only ever renders published records, ordered by the display
 * order set in the (future) admin layer.
 */
export function getPublishedWorkProjects(
  projects: WorkProject[] = demoWorkProjects,
): WorkProject[] {
  return projects
    .filter((project) => project.status === 'published')
    .sort((a, b) => a.order - b.order)
}
