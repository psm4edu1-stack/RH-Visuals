import type { PublicProject, ServiceItem } from '../types'

/**
 * PLACEHOLDER PROJECT DATA
 * ------------------------
 * The entries below are sample/placeholder projects prepared for the RH VISUALS
 * portfolio. They are not real client engagements and must not be presented as
 * genuine work. Replace each record (and its cover image) with confirmed
 * productions before publishing.
 */
export const projects: PublicProject[] = [
  {
    slug: 'lumen-fields',
    title: 'Lumen Fields',
    client: 'Lumen Fields',
    category: 'Festival',
    location: 'Hyderabad, India',
    year: '2026',
    cover: '/images/work-horizon.jpg',
    gallery: ['/images/work-horizon.jpg', '/images/hero-crowd.jpg', '/images/festival-lights.jpg'],
    summary:
      'A three-stage visual universe for a festival built on light, landscape and collective release.',
    challenge:
      'Lumen Fields was outgrowing its indie roots. The brief asked for a visual language that could hold a 42,000-person main stage while still feeling handmade, human and strangely intimate. The system also had to survive daylight, dust, a compressed changeover schedule and 24 different artist sets.',
    approach:
      'We treated the site as one continuous canvas. A modular “light field” identity moved across LED, projection and live camera, changing scale and intensity with the sun. Artist content kits were designed around three repeatable visual behaviours, then individually tuned with each act. Redundancy was built into every layer of playback.',
    outcome:
      'The festival sold out nine days early. Our visual system became the campaign’s recognisable signature, carrying from first announcement through to the final confetti drop. The modular toolkit reduced artist onboarding time by 40% and is now the foundation of the 2027 edition.',
    services: ['Creative direction', 'Festival identity', 'LED content systems', 'Projection mapping', 'Show control'],
    metrics: [
      { value: '42K', label: 'Guests' },
      { value: '3', label: 'Stages' },
      { value: '24', label: 'Artist kits' },
    ],
    featured: true,
    color: '#F15B40',
  },
  {
    slug: 'nocturne-after-dark',
    title: 'Nocturne: After Dark',
    client: 'Nocturne Events',
    category: 'Nightlife',
    location: 'Chennai, India',
    year: '2026',
    cover: '/images/nightlife.jpg',
    gallery: ['/images/nightlife.jpg', '/images/work-nocturne.jpg', '/images/work-atelier.jpg'],
    summary:
      'A living, generative visual environment for the city’s most talked-about late-night series.',
    challenge:
      'The club wanted visuals that felt like a resident artist, not a playlist. The environment had to evolve over a five-hour night, respond to the room, and stay legible on a tight, irregular LED layout. There was no space for heavy rigging or a large crew.',
    approach:
      'We built a generative system around smoke, shadow and spectral colour. Audio-reactive fields shifted with the room’s energy, while a library of hand-treated textures kept the image tactile. A compact media server and two operators ran the full programme from the side of stage.',
    outcome:
      'The series reached capacity for eight consecutive weekends. Clips from the visual environment generated over 2.4 million organic views and established a new visual signature for Nocturne’s national expansion.',
    services: ['Generative visuals', 'LED design', 'Show operation', 'Content direction'],
    metrics: [
      { value: '8', label: 'Weekends' },
      { value: '2.4M', label: 'Organic views' },
      { value: '5hrs', label: 'Live system' },
    ],
    featured: true,
    color: '#7541A8',
  },
  {
    slug: 'aurora-live',
    title: 'Aurora Live',
    client: 'Aurora Live',
    category: 'Live Music',
    location: 'Mumbai, India',
    year: '2026',
    cover: '/images/festival-lights.jpg',
    gallery: ['/images/festival-lights.jpg', '/images/work-pulse.jpg', '/images/performance.jpg'],
    summary:
      'A touring visual system for the Eclipse Tour — built to make 16,000 people feel close to one voice.',
    challenge:
      'Aurora’s show had grown from clubs to arenas in eighteen months. The tour needed a visual language that could expand and contract without losing its intimacy. It also needed to travel safely across five cities, four LED configurations and a crew of local technicians.',
    approach:
      'We designed a content system with a clear emotional arc: horizon, rupture, eclipse, afterglow. Every frame was built for scale, then pressure-tested on each venue’s exact LED map. A timecode-led playback system meant the show could be reproduced by local crews with minimal rehearsal.',
    outcome:
      'Sixteen sold-out shows, zero playback incidents and a live album film that carried the visual world into the campaign. The system now travels as a single tour drive with venue-specific patch files.',
    services: ['Tour content system', 'LED design', 'Media server programming', 'Show direction'],
    metrics: [
      { value: '16K', label: 'Per show' },
      { value: '5', label: 'Cities' },
      { value: '0', label: 'Playback errors' },
    ],
    featured: true,
    color: '#FFC928',
  },
  {
    slug: 'meridian-summit',
    title: 'Meridian Global Summit',
    client: 'Meridian Group',
    category: 'Corporate',
    location: 'Singapore',
    year: '2026',
    cover: '/images/conference.jpg',
    gallery: ['/images/conference.jpg', '/images/corporate-gala.jpg', '/images/about-stage.png'],
    summary:
      'A three-day flagship summit where clarity, scale and one unforgettable moment shared the same stage.',
    challenge:
      'A global leadership summit can drown in content. Meridian needed a system that could hold 2,400 delegates across three days, support hundreds of slides and films, and still create a genuine sense of occasion. Brand guidelines were strict, and final content needed legal sign-off 72 hours before doors.',
    approach:
      'We built a calm, high-contrast graphic system with a single kinetic gesture: the Meridian line, which appeared in every transition and animated keynote. Content was templated for scale, while the opening and closing films were made as cinematic anchors. A dedicated show caller kept 97 cues running to time.',
    outcome:
      'Three flawless days. The opening film was shared internally 8,400 times, and the visual system was adopted across the company’s regional events. The phrase “make it feel like Meridian” entered the internal brief.',
    services: ['Keynote graphics', 'Stage content', 'LED production', 'Show operation'],
    metrics: [
      { value: '2.4K', label: 'Delegates' },
      { value: '3', label: 'Days' },
      { value: '97', label: 'Show cues' },
    ],
    featured: true,
    color: '#A0A0B2',
  },
  {
    slug: 'atelier-north',
    title: 'Form / Function',
    client: 'Atelier North',
    category: 'Brand Experience',
    location: 'Bengaluru, India',
    year: '2025',
    cover: '/images/brand-launch.jpg',
    gallery: ['/images/brand-launch.jpg', '/images/hero-confetti.jpg', '/images/work-atelier.jpg'],
    summary:
      'An intimate product reveal where projected material studies turned a warehouse into a living sketchbook.',
    challenge:
      'Atelier North wanted to introduce a furniture collection without a traditional stage presentation. The space was a working warehouse with awkward columns and limited rigging. The audience of 300 included architects, press and collectors who value craft over spectacle.',
    approach:
      'We projected directly onto the collection’s surfaces — linen, stone and brushed steel — turning the material itself into the screen. Hand-drawn studies and macro textures moved slowly enough to feel observed rather than performed. Light levels were choreographed with the room’s existing fixtures.',
    outcome:
      'The launch generated three international design features and a 60% sell-through of the first collection within two weeks. The projection suite was later adapted into the brand’s first digital campaign.',
    services: ['Spatial projection', 'Content design', 'Interactive installation', 'Show operation'],
    metrics: [
      { value: '300', label: 'Guests' },
      { value: '3', label: 'Material surfaces' },
      { value: '60%', label: 'First-edition sell-through' },
    ],
    color: '#C9856C',
  },
  {
    slug: 'sable-nocturne',
    title: 'Sable: Nocturne',
    client: 'Sable & Co.',
    category: 'Brand Experience',
    location: 'Mumbai, India',
    year: '2026',
    cover: '/images/hero-confetti.jpg',
    gallery: ['/images/hero-confetti.jpg', '/images/work-atelier.jpg', '/images/nightlife.jpg'],
    summary:
      'A monochrome fashion reveal shaped by shadow, fabric and a single architectural projection.',
    challenge:
      'The collection was built around absence: black on black, texture hidden in low light. A traditional bright runway would have destroyed the idea. The room also had heritage restrictions, ruling out rigging and high-heat fixtures.',
    approach:
      'We replaced flat lighting with a responsive projection environment. The model’s movement triggered subtle shifts in the fabric-like field behind them. Camera operators worked with a custom low-light grade, and every guest entered through a threshold of moving shadow.',
    outcome:
      'The show became Sable’s most-covered launch to date, with the projection environment featured in Vogue India and Design Fabric. The brand returned for a second season conversation.',
    services: ['Creative direction', 'Projection environment', 'Live camera grade', 'Guest experience'],
    metrics: [
      { value: '220', label: 'Guests' },
      { value: '1', label: 'Signature projection' },
      { value: '6', label: 'Press features' },
    ],
    color: '#8B6BB1',
  },
]

export const services: ServiceItem[] = [
  {
    id: 'live-visuals',
    title: 'Live Visuals & Content',
    short: 'The visual language of the show.',
    description:
      'Artist-led visual systems for concerts, festivals and live performance. From a single hero moment to a full touring content library, we design every frame for the room, the screen and the crowd in front of it.',
    image: '/images/work-pulse.jpg',
    deliverables: ['Creative direction', 'Show content systems', 'Artist visual kits', 'Generative design', 'Live camera design'],
    startingAt: '₹2,50,000',
  },
  {
    id: 'projection-mapping',
    title: 'Projection & Spatial',
    short: 'Surface becomes story.',
    description:
      'Projection design and mapping that treats architecture, object and landscape as canvas. We handle concept, content, calibration and on-site playback as one continuous craft.',
    image: '/images/brand-launch.jpg',
    deliverables: ['Projection mapping', 'Spatial content', 'Interactive systems', 'Technical design', 'On-site calibration'],
    startingAt: '₹3,50,000',
  },
  {
    id: 'show-design',
    title: 'Show & Technical Direction',
    short: 'One system, every cue.',
    description:
      'The quiet architecture behind an effortless show. We unite content, screens, lighting cues and playback into a single clear operating system, led by someone who owns the outcome on site.',
    image: '/images/conference.jpg',
    deliverables: ['Show design', 'Media server programming', 'Timecode & cueing', 'Crew planning', 'On-site show operation'],
    startingAt: '₹4,00,000',
  },
  {
    id: 'festival-production',
    title: 'Festival & Tour Production',
    short: 'Built to travel, made to land.',
    description:
      'Scalable visual production for festivals, tours and multi-city programmes. Redundant systems, venue-specific adaptation and a crew that stays calm when the schedule changes.',
    image: '/images/hero-crowd.jpg',
    deliverables: ['Multi-stage content', 'Touring systems', 'Festival identity', 'Artist onboarding', 'Production management'],
    startingAt: '₹8,00,000',
  },
  {
    id: 'brand-experiences',
    title: 'Brand & Corporate Experiences',
    short: 'Clarity with a pulse.',
    description:
      'Visual experiences for launches, summits, galas and leadership moments. We balance the precision a brand demands with the emotional moment an audience remembers.',
    image: '/images/corporate-gala.jpg',
    deliverables: ['Keynote graphics', 'Stage content', 'Launch environments', 'Interactive moments', 'Show operation'],
    startingAt: '₹2,00,000',
  },
  {
    id: 'nightlife',
    title: 'Nightlife & Hospitality',
    short: 'A resident visual language.',
    description:
      'Generative environments and visual identities for clubs, bars and hospitality spaces. Designed to evolve night after night without needing a full production crew.',
    image: '/images/nightlife.jpg',
    deliverables: ['Generative visuals', 'Venue identity', 'LED content', 'Compact show systems', 'Resident training'],
    startingAt: '₹1,50,000',
  },
]

export const testimonials = [
  {
    quote:
      'RH VISUALS doesn’t just make things move. They understand the emotional temperature of a room and know exactly when to push it. Our festival finally has a soul.',
    name: 'Tara Nair',
    role: 'Creative Director, Lumen Fields',
    project: 'Lumen Fields 2026',
  },
  {
    quote:
      'Calm, exacting and genuinely creative. The kind of partner you want when 2,400 people are watching and the countdown has already started.',
    name: 'Aisha Rao',
    role: 'VP Brand & Communications, Meridian Group',
    project: 'Meridian Global Summit',
  },
  {
    quote:
      'They found a visual language that felt like our music, not a package built for someone else. The tour became something people talked about long after the last song.',
    name: 'Maya Pinto',
    role: 'Artist Manager, Aurora Live',
    project: 'Eclipse Tour',
  },
]

export const faqs = [
  {
    q: 'What kind of events do you take on?',
    a: 'We work across concerts, festivals, nightlife, brand launches, corporate summits, galas and one-off performances. If the moment depends on atmosphere and visual storytelling, it is likely our kind of project.',
  },
  {
    q: 'How early should we get in touch?',
    a: 'For full production and touring work, 6–12 weeks gives us the right runway. Intimate brand moments can sometimes be turned around in 3–4 weeks. Tell us your date and we will be honest about availability.',
  },
  {
    q: 'Do you work outside India?',
    a: 'Yes. The studio is based in Chennai and regularly produces across India, Singapore, Dubai and beyond. We can assemble local crews and handle equipment through trusted production partners.',
  },
  {
    q: 'What does a project investment look like?',
    a: 'Every quote is built around the actual brief: content hours, screen area, crew days, equipment and travel. We do not publish fixed packages or estimate a price before understanding the room, the date and the scope.',
  },
  {
    q: 'Can you work with our existing production team?',
    a: 'Absolutely. We often collaborate with established technical teams, or act as a visual partner inside a larger production. We are comfortable leading, following and integrating.',
  },
]

export const studioStats = [
  { value: '120+', label: 'Live shows delivered' },
  { value: '9', label: 'Years in production' },
  { value: '14', label: 'Cities travelled' },
  { value: '0', label: 'Compromised moments' },
]
