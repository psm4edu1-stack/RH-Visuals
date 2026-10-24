import { db } from '../db/database.js'
import { serviceFromRow, projectFromRow } from './serializers.js'
import { getPublicSettings } from './settings.js'

function studioContact() {
  const settings = getPublicSettings()
  return {
    email: settings.email,
    phone: settings.phone,
    location: settings.city || settings.address,
    contactPath: '/contact',
  }
}

function publicContext() {
  const services = db
    .prepare(`SELECT * FROM services WHERE status = 'published' ORDER BY sort_order, created_at`)
    .all()
    .map(serviceFromRow)
  const projects = db
    .prepare(`SELECT * FROM projects WHERE status = 'published' ORDER BY sort_order, created_at`)
    .all()
    .map(projectFromRow)
  return { services, projects, settings: getPublicSettings() }
}

function contactSummary(contact) {
  const details = [contact.email, contact.phone].filter(Boolean).join(' or ')
  return details || 'the contact form'
}

export function normalizeChatHistory(value) {
  if (!Array.isArray(value)) return []
  return value
    .slice(-8)
    .map((item) => {
      const role = item?.role === 'assistant' ? 'assistant' : item?.role === 'user' ? 'user' : null
      const content = typeof item?.content === 'string' ? item.content.trim().slice(0, 500) : ''
      return role && content ? { role, content } : null
    })
    .filter(Boolean)
}

function serviceLines(services) {
  return services
    .map((service) => {
      const summary = service.short ? ` — ${service.short}` : ''
      return `• ${service.title}${summary}`
    })
    .join('\n')
}

function projectLines(projects) {
  return projects
    .slice(0, 6)
    .map((project) => {
      const details = [project.category, project.year].filter(Boolean).join(', ')
      return `• ${project.title}${details ? ` — ${details}` : ''}`
    })
    .join('\n')
}

function ruleBasedReply(message) {
  const text = String(message || '').toLowerCase()
  const { services, projects, settings } = publicContext()
  const contact = {
    email: settings.email,
    phone: settings.phone,
    location: settings.city || settings.address,
    contactPath: '/contact',
  }
  const serviceNames = services.map((service) => service.title)

  if (/^(hi|hello|hey|good morning|good evening)\b/.test(text)) {
    return `Hello. I’m the RH VISUALS studio guide. I can help with published services, selected work, event production, the enquiry process and how to reach the studio.\n\nWhat kind of event are you planning?`
  }

  if (/price|cost|budget|investment|rate|quote|expensive|charge/.test(text)) {
    return `Project investment depends on scope, screen area, crew, equipment and travel. The studio does not publish fixed packages, and a quote is only confirmed after a producer reviews your brief.\n\nShare your date, city, audience scale and visual requirements through the contact form, and the team will respond with an honest next step: ${contact.contactPath}`
  }

  if (/availability|available|date|book|slot|when/.test(text)) {
    return `Availability is confirmed by the production team after reviewing the date, city and scope. I can’t hold or confirm a date from chat.\n\nSend the date through the contact form and a producer will respond within one working day: ${contact.contactPath}`
  }

  if (/service|offer|do you|capabilit|projection|visual|show design|production|technical/.test(text)) {
    if (serviceNames.length === 0) {
      return `The studio’s published service catalogue is being updated right now, so I don’t want to list an unverified capability. A producer can confirm the right scope for your event.\n\nSend a brief here: ${contact.contactPath}`
    }
    return `The studio’s published capabilities are:\n${serviceLines(services)}\n\nEach discipline can stand alone or combine into a full visual production. The Services page has the detailed scope for each one.\n\nTell me your event type if you want a closer starting point.`
  }

  if (/where|location|based|city|travel|international|worldwide/.test(text)) {
    return contact.location
      ? `The studio is based in ${contact.location}. The team works with local crews and production partners for projects further afield.\n\nShare your city and date through ${contact.contactPath} and the team can advise on the practical production plan.`
      : `The studio's verified location is not listed here. Please ask the team directly through ${contact.contactPath}.`
  }

  if (/portfolio|work|case|example|project|show me/.test(text)) {
    if (projects.length === 0) {
      return `There are no published portfolio projects available on the public site right now. The Work page is the place to check once new productions are published, and I won’t invent project details.\n\nFor a closer conversation about your event, send a brief here: ${contact.contactPath}`
    }
    return `Published work includes:\n${projectLines(projects)}\n\nYou can view the portfolio on the Work page: /work\n\nIf you tell me the kind of event you’re planning, I can point you to the closest published service.`
  }

  if (/process|timeline|how long|next step|brief|enquir|inquir/.test(text)) {
    return `A useful first brief includes: event date, city, audience scale, event type, the services you need and the moment you want people to remember. A producer reads it and replies within one working day.\n\nSend it here: ${contact.contactPath}`
  }

  if (/contact|email|phone|call|talk|human|team/.test(text)) {
    return `You can reach the studio at ${contactSummary(contact)}. The contact form is the fastest route for a new brief: ${contact.contactPath}\n\nA producer replies within one working day.`
  }

  if (/festival|concert|tour|music|artist/.test(text)) {
    if (serviceNames.length > 0) {
      return `For live music, the studio’s published capabilities include:\n${serviceLines(services)}\n\nSend the artist, date and venue scale through ${contact.contactPath} to start a practical conversation.`
    }
    return `Send the artist, date and venue scale through ${contact.contactPath} and a producer will confirm whether the studio is the right fit.`
  }

  if (/corporate|conference|gala|summit|brand|launch/.test(text)) {
    return `For corporate and brand moments, the studio focuses on clear stage content, projection and show operation without losing the emotional beat. The published service records on the Services page carry the detailed scope.\n\nShare your programme and the moment you want the room to remember: ${contact.contactPath}`
  }

  if (/nightlife|club|venue|dj|residency/.test(text)) {
    return `For venues and nightlife, the studio builds visual identities and compact show systems that can run night after night, with resident training where useful.\n\nTell us the room, screen layout and programme through ${contact.contactPath}.`
  }

  return `I can help with published services, selected work, event production, availability and how to contact the studio. I don’t invent quotes, availability or project details — a producer confirms those after reading your brief.\n\nTry asking about a service, or start here: ${contact.contactPath}`
}

export async function answerChat(message, history = []) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { reply: ruleBasedReply(message), mode: 'rules' }
  }

  const { services, projects, settings } = publicContext()
  const contact = {
    email: settings.email,
    phone: settings.phone,
    location: settings.city || settings.address,
    contactPath: '/contact',
  }
  const context = {
    business: `${settings.studioName} — live visual production studio`,
    contact,
    services: services.map((service) => ({
      title: service.title,
      summary: service.short,
      description: service.description,
      startingAt: service.startingAt,
    })),
    publishedProjects: projects.map((project) => ({
      title: project.title,
      category: project.category,
      client: project.client,
      location: project.location,
      year: project.year,
      description: project.description,
    })),
  }

  const systemPrompt = `You are the RH VISUALS studio guide on the public website. Answer only from the supplied context. Be concise, warm and useful. Never invent prices, availability, clients, metrics, project results or capabilities. If a date, quote or commitment is requested, direct the visitor to the contact form. Do not ask for sensitive information. When the answer is not in the context, say so and offer the contact form.
Context: ${JSON.stringify(context)}`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.25,
        max_tokens: 350,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: message },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`AI provider responded ${response.status}`)
    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content?.trim()
    if (!reply) throw new Error('AI provider returned an empty response')
    return { reply, mode: 'ai' }
  } catch (error) {
    console.warn('[chat] AI provider unavailable, using rule-based fallback:', error.message)
    return { reply: ruleBasedReply(message), mode: 'rules' }
  }
}

export function chatStatus() {
  return {
    aiEnabled: Boolean(process.env.OPENAI_API_KEY),
    mode: process.env.OPENAI_API_KEY ? 'ai' : 'rules',
  }
}
