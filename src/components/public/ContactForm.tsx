import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight,
  Check,
  Clock3,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Send,
} from 'lucide-react'
import { ApiError, api } from '../../lib/api'
import { useToast } from '../ui/Toast'

const contactEmail = 'hello@rhvisuals.studio'
const contactPhone = '+91 98400 21644'
const contactPhoneHref = '+919840021644'

const eventTypes = [
  'Concert or festival',
  'Corporate event',
  'Product launch',
  'Nightclub or entertainment event',
  'Wedding or celebration',
  'Fashion or cultural event',
  'Sports event',
  'Other',
]

const budgets = [
  { value: '', label: 'Select a range (optional)' },
  { value: '150000', label: '₹1.5L — ₹5L' },
  { value: '500000', label: '₹5L — ₹10L' },
  { value: '1000000', label: '₹10L — ₹25L' },
  { value: '2500000', label: '₹25L — ₹50L' },
  { value: '5000000', label: '₹50L+' },
  { value: '0', label: 'Still exploring' },
]

type FormState = {
  name: string
  email: string
  company: string
  phone: string
  eventType: string
  eventDate: string
  venue: string
  audienceSize: string
  budget: string
  services: string
  message: string
}

type FieldErrors = Partial<Record<keyof FormState, string>>

const initialForm: FormState = {
  name: '',
  email: '',
  company: '',
  phone: '',
  eventType: '',
  eventDate: '',
  venue: '',
  audienceSize: '',
  budget: '',
  services: '',
  message: '',
}

function minEventDate() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`
}

function validateEnquiry(form: FormState): FieldErrors {
  const errors: FieldErrors = {}
  const name = form.name.trim()
  const email = form.email.trim().toLowerCase()
  const phone = form.phone.trim()

  if (name.length < 2) {
    errors.name = 'Enter your full name.'
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (
    phone &&
    (!/^[+()\d\s.-]{7,32}$/.test(phone) || phone.replace(/\D/g, '').length < 7)
  ) {
    errors.phone = 'Enter a valid phone number or leave it blank.'
  }
  if (!form.eventType) {
    errors.eventType = 'Choose an event type.'
  }
  if (form.eventDate) {
    const selectedDate = new Date(`${form.eventDate}T00:00:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (Number.isNaN(selectedDate.getTime()) || selectedDate < today) {
      errors.eventDate = 'Choose a valid event date that has not already passed.'
    }
  }
  if (form.audienceSize.trim()) {
    const audience = Number(form.audienceSize)
    if (!Number.isInteger(audience) || audience < 1 || audience > 1_000_000) {
      errors.audienceSize = 'Enter an audience size between 1 and 1,000,000.'
    }
  }
  if (form.message.trim().length < 10) {
    errors.message = 'Add a little more detail about the event (at least 10 characters).'
  }

  return errors
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <small className="field-error" id={id}>
      {message}
    </small>
  )
}

export function ContactForm() {
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const requestedService = (searchParams.get('service') || '').slice(0, 1200)
  const formRef = useRef<HTMLFormElement>(null)
  const [form, setForm] = useState<FormState>(() => ({
    ...initialForm,
    services: requestedService,
  }))
  const [website, setWebsite] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [success, setSuccess] = useState(false)
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!requestedService) return
    setForm((current) =>
      current.services === requestedService
        ? current
        : { ...current, services: requestedService },
    )
  }, [requestedService])

  const update = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((current) => {
        const next = { ...current }
        delete next[field]
        return next
      })
    }
    if (error) setError('')
  }

  const focusField = (field: keyof FormState) => {
    window.requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus()
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const nextErrors = validateEnquiry(form)
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setError('Please check the highlighted fields before sending your enquiry.')
      focusField(Object.keys(nextErrors)[0] as keyof FormState)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const result = await api.public.submitEnquiry({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        company: form.company.trim(),
        phone: form.phone.trim(),
        eventType: form.eventType,
        eventDate: form.eventDate,
        venue: form.venue.trim(),
        audienceSize: form.audienceSize.trim() ? Number(form.audienceSize) : 0,
        budget: form.budget ? Number(form.budget) : 0,
        services: form.services
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        message: form.message.trim(),
        website,
      })
      if (!result?.enquiry?.id) {
        throw new ApiError(502, 'The studio service returned an unexpected response.')
      }
      setSuccess(true)
      setReference(result.enquiry.id.slice(0, 8).toUpperCase())
      setForm(initialForm)
      setFieldErrors({})
      setWebsite('')
      toast('Your enquiry is with the studio', {
        description: 'The brief was saved in the studio inbox.',
      })
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        const nextFieldErrors: FieldErrors = {}
        if (submitError.fields) {
          for (const [field, message] of Object.entries(submitError.fields)) {
            if (Object.prototype.hasOwnProperty.call(initialForm, field)) {
              nextFieldErrors[field as keyof FormState] = message
            }
          }
        }
        setFieldErrors(nextFieldErrors)
        setError(submitError.message || 'Your enquiry could not be sent.')
        const firstError = Object.keys(nextFieldErrors)[0] as keyof FormState | undefined
        if (firstError) focusField(firstError)
      } else {
        setError('Your enquiry could not be sent. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="enquiry-success" role="status" aria-live="polite">
        <span className="enquiry-success__icon">
          <Check size={28} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <p className="eyebrow">Enquiry received</p>
        <h2>Your brief is with the studio.</h2>
        <p>
          We’ve saved your enquiry and a producer will review it. We’ll follow up using
          the contact details you provided.
        </p>
        <div className="enquiry-success__actions">
          <Link to="/" className="btn btn--gold">
            Back to Home <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => {
              setSuccess(false)
              setReference('')
            }}
          >
            Send another enquiry
          </button>
        </div>
        <span className="enquiry-success__note">
          Reference: <strong>{reference}</strong> · Saved in the studio inbox.
        </span>
      </div>
    )
  }

  return (
    <form ref={formRef} className="enquiry-form" onSubmit={handleSubmit} noValidate>
      <div className="enquiry-form__header">
        <div>
          <p className="eyebrow">Event enquiry</p>
          <h2>Tell us about the moment.</h2>
        </div>
        <span className="enquiry-form__step">Fields marked * are required</span>
      </div>

      {error && (
        <p className="enquiry-form__alert" role="alert">
          {error}
        </p>
      )}

      <div className="form-grid form-grid--two">
        <div className="field field--dark">
          <label htmlFor="contact-name">Full name <b>*</b></label>
          <input
            id="contact-name"
            name="name"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            maxLength={120}
            required
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
          />
          <FieldError id="contact-name-error" message={fieldErrors.name} />
        </div>

        <div className="field field--dark">
          <label htmlFor="contact-email">Email address <b>*</b></label>
          <input
            id="contact-email"
            name="email"
            type="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            maxLength={254}
            required
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
          />
          <FieldError id="contact-email-error" message={fieldErrors.email} />
        </div>
      </div>

      <div className="form-grid form-grid--two">
        <div className="field field--dark">
          <label htmlFor="contact-company">
            Company / organisation <span className="field__optional">Optional</span>
          </label>
          <input
            id="contact-company"
            name="company"
            value={form.company}
            onChange={(event) => update('company', event.target.value)}
            placeholder="Studio, brand or promoter"
            autoComplete="organization"
            maxLength={160}
          />
        </div>

        <div className="field field--dark">
          <label htmlFor="contact-phone">
            Phone <span className="field__optional">Optional</span>
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
            placeholder="+91"
            autoComplete="tel"
            maxLength={32}
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? 'contact-phone-error' : undefined}
          />
          <FieldError id="contact-phone-error" message={fieldErrors.phone} />
        </div>
      </div>

      <div className="form-grid form-grid--two">
        <div className="field field--dark">
          <label htmlFor="contact-event-type">Event type <b>*</b></label>
          <select
            id="contact-event-type"
            name="eventType"
            value={form.eventType}
            onChange={(event) => update('eventType', event.target.value)}
            required
            aria-invalid={Boolean(fieldErrors.eventType)}
            aria-describedby={fieldErrors.eventType ? 'contact-event-type-error' : undefined}
          >
            <option value="">Select an event type</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <FieldError id="contact-event-type-error" message={fieldErrors.eventType} />
        </div>

        <div className="field field--dark">
          <label htmlFor="contact-event-date">
            Event date <span className="field__optional">Optional</span>
          </label>
          <input
            id="contact-event-date"
            name="eventDate"
            type="date"
            value={form.eventDate}
            onChange={(event) => update('eventDate', event.target.value)}
            min={minEventDate()}
            aria-invalid={Boolean(fieldErrors.eventDate)}
            aria-describedby={fieldErrors.eventDate ? 'contact-event-date-error' : undefined}
          />
          <FieldError id="contact-event-date-error" message={fieldErrors.eventDate} />
        </div>
      </div>

      <div className="form-grid form-grid--two">
        <div className="field field--dark">
          <label htmlFor="contact-venue">
            Event location <span className="field__optional">Optional</span>
          </label>
          <input
            id="contact-venue"
            name="venue"
            value={form.venue}
            onChange={(event) => update('venue', event.target.value)}
            placeholder="City, venue or region"
            maxLength={240}
          />
        </div>

        <div className="field field--dark">
          <label htmlFor="contact-audience">
            Expected audience <span className="field__optional">Optional</span>
          </label>
          <input
            id="contact-audience"
            name="audienceSize"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000000}
            step={1}
            value={form.audienceSize}
            onChange={(event) => update('audienceSize', event.target.value)}
            placeholder="Approximate size"
            aria-invalid={Boolean(fieldErrors.audienceSize)}
            aria-describedby={
              fieldErrors.audienceSize ? 'contact-audience-error' : undefined
            }
          />
          <FieldError id="contact-audience-error" message={fieldErrors.audienceSize} />
        </div>
      </div>

      <div className="form-grid form-grid--two">
        <div className="field field--dark">
          <label htmlFor="contact-budget">
            Budget range <span className="field__optional">Optional</span>
          </label>
          <select
            id="contact-budget"
            name="budget"
            value={form.budget}
            onChange={(event) => update('budget', event.target.value)}
          >
            {budgets.map((budget) => (
              <option key={budget.value} value={budget.value}>
                {budget.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field field--dark">
          <label htmlFor="contact-services">
            Services required <span className="field__optional">Optional</span>
          </label>
          <input
            id="contact-services"
            name="services"
            value={form.services}
            onChange={(event) => update('services', event.target.value)}
            placeholder="Live visuals, projection, show operation…"
            maxLength={1200}
          />
        </div>
      </div>

      <div className="field field--dark field--full">
        <label htmlFor="contact-message">Event description / requirements <b>*</b></label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          value={form.message}
          onChange={(event) => update('message', event.target.value)}
          placeholder="The audience, the room, the visual ambition — a rough brief is perfect."
          minLength={10}
          maxLength={5000}
          required
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
        />
        <FieldError id="contact-message-error" message={fieldErrors.message} />
      </div>

      <div className="honeypot" aria-hidden="true">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
      </div>

      <div className="enquiry-form__footer">
        <p className="enquiry-form__privacy">
          Your details stay with the studio. No lists, no noise.
        </p>
        <button
          type="submit"
          className="btn btn--gold enquiry-form__submit"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <LoaderCircle className="spin" size={16} aria-hidden="true" />
              Sending enquiry…
            </>
          ) : (
            <>
              <Send size={16} aria-hidden="true" />
              Send Enquiry
            </>
          )}
        </button>
      </div>
    </form>
  )
}

export function ContactDetails() {
  return (
    <div className="contact-info">
      <section className="contact-info__panel" aria-labelledby="contact-info-title">
        <p className="eyebrow eyebrow--rule">Studio contact</p>
        <h2 id="contact-info-title">Talk to a producer.</h2>
        <p className="contact-info__intro">
          For event production, collaborations and production questions.
        </p>

        <div className="contact-info__list">
          <a className="contact-info__item" href={`mailto:${contactEmail}`}>
            <span className="contact-info__icon">
              <Mail size={16} aria-hidden="true" />
            </span>
            <span className="contact-info__item-copy">
              <small>Email</small>
              <strong>{contactEmail}</strong>
            </span>
            <ArrowUpRight className="contact-info__arrow" size={15} aria-hidden="true" />
          </a>

          <a className="contact-info__item" href={`tel:${contactPhoneHref}`}>
            <span className="contact-info__icon">
              <Phone size={16} aria-hidden="true" />
            </span>
            <span className="contact-info__item-copy">
              <small>Phone</small>
              <strong>{contactPhone}</strong>
            </span>
            <ArrowUpRight className="contact-info__arrow" size={15} aria-hidden="true" />
          </a>

          <div className="contact-info__item">
            <span className="contact-info__icon">
              <MapPin size={16} aria-hidden="true" />
            </span>
            <span className="contact-info__item-copy">
              <small>Studio</small>
              <strong>No. 14, Rutland Gate, 4th Street</strong>
              <span>Chennai 600006, India</span>
            </span>
          </div>
        </div>

        <div className="contact-info__response">
          <Clock3 size={16} aria-hidden="true" />
          <div>
            <small>Response</small>
            <strong>One working day, usually less.</strong>
          </div>
        </div>
      </section>

      <section className="contact-info__note" aria-labelledby="contact-info-brief">
        <p className="eyebrow">A useful brief</p>
        <p id="contact-info-brief">
          Date, city, audience scale and the services you have in mind. A rough idea is
          enough to begin.
        </p>
      </section>

      <p className="contact-info__small">Working worldwide · Travelling from Chennai</p>
    </div>
  )
}
