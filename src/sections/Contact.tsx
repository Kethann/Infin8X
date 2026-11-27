import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { contact, accentVar, isTodo } from '../content/sections';
import { brand } from '../content/site';
import { Chapter } from '../components/Chapter';
import { Icon } from '../components/Icon';
import { check, valid, LIMITS, MIN_FILL_MS, COOLDOWN_MS, type Field, type Values } from '../lib/contactRules';

const LAST_SENT = 'infin8x:contact-sent';
const lastSent = () => { try { return Number(localStorage.getItem(LAST_SENT)) || 0; } catch { return 0; } };

type Status = 'idle' | 'sending' | 'sent' | 'error';

function Choice({ name, legend, options, initial, disabled }: { name: string; legend: string; options: readonly string[]; initial: string; disabled: boolean }) {
  return (
    <fieldset className="field field--wide choice" disabled={disabled}>
      <legend>{legend}</legend>
      <div className="choice__opts">
        {options.map((o) => (
          <label key={o} className="choice__opt">
            <input type="radio" name={name} value={o} defaultChecked={o === initial} /><span>{o}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * 06 Contact. The idea leaves as light: while sending, a spectral sweep crosses the form; when it lands, the
 * form's edge settles into the chapter colour. The optional budget is free text; timeline choices stay easy to scan.
 */
export function Contact() {
  const [status, setStatus] = useState<Status>('idle');
  const [mailto, setMailto] = useState('');
  const [values, setValues] = useState<Values>({ name: '', email: '', idea: '', budget: '' });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [cooling, setCooling] = useState(() => Date.now() - lastSent() < COOLDOWN_MS);
  const shownAt = useRef(Date.now());
  const hasEmail = !!brand.email && !isTodo(brand.email);
  // after a send, one minute before the next (kept across reloads)
  useEffect(() => {
    if (!cooling) return;
    const t = window.setTimeout(() => setCooling(false), Math.max(0, COOLDOWN_MS - (Date.now() - lastSent())));
    return () => window.clearTimeout(t);
  }, [cooling]);
  const error = (f: Field) => { const r = check(f, values[f]); return r ? contact.errors[f][r] : null; };
  const showError = (f: Field) => (touched[f] ? error(f) : null);
  const ready = valid(values) && !cooling;
  const set = (f: Field) => (e: { currentTarget: { value: string } }) => { const v = e.currentTarget.value; setValues((p) => ({ ...p, [f]: v })); };
  const leave = (f: Field) => () => setTouched((p) => ({ ...p, [f]: true }));
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'sending') return;
    if (!valid(values) || cooling) { setTouched({ name: true, email: true, idea: true, budget: true }); return; }
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    // bots: the hidden field is filled, or the form was sent faster than anyone could type it; look sent, send nothing
    if (data.company || Date.now() - shownAt.current < MIN_FILL_MS) { setStatus('sent'); return; }
    const body = `Name: ${data.name}\nEmail: ${data.email}\nBudget: ${data.budget}\nTimeline: ${data.timeline}\n\n${data.idea}`;
    setMailto(hasEmail ? `mailto:${brand.email}?subject=${encodeURIComponent('New idea for Infin8X')}&body=${encodeURIComponent(body)}` : '');
    setStatus('sending');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...data, elapsed: Date.now() - shownAt.current }), signal: controller.signal });
      if (!res.ok || (await res.json()).ok !== true) throw new Error('Message was not accepted');
      setStatus('sent'); form.reset();
      setValues({ name: '', email: '', idea: '', budget: '' }); setTouched({});
      try { localStorage.setItem(LAST_SENT, String(Date.now())); } catch { /* private browsing */ }
      setCooling(true);
    } catch { setStatus('error'); }
    finally { window.clearTimeout(timeout); }
  };
  const busy = status === 'sending';
  const field = (f: Field, label: string, input: (props: Record<string, unknown>) => JSX.Element, required = true) => {
    const err = showError(f);
    return (
      <div className={`field${f === 'idea' || f === 'budget' ? ' field--wide' : ''}${err ? ' is-invalid' : ''}`}>
        <label htmlFor={`f-${f}`}>{label}{required && <span className="field__req">{contact.required}</span>}</label>
        {input({ id: `f-${f}`, name: f, disabled: busy, value: values[f], onChange: set(f), onBlur: leave(f), maxLength: LIMITS[f][1],
          required, 'aria-invalid': err ? true : undefined, 'aria-describedby': err ? `f-${f}-err` : undefined })}
        <i aria-hidden="true" />
        {f === 'idea' && <span className="field__count" aria-hidden="true">{values.idea.trim().length} / {LIMITS.idea[1]}</span>}
        {err && <p id={`f-${f}-err`} className="field__error">{err}</p>}
      </div>
    );
  };
  return (
    <section id="contact" className="section contact" data-chapter="contact" data-chapter-label="Contact"
      style={{ '--section-accent': accentVar(contact.accent) } as CSSProperties} aria-labelledby="contact-h">
      <div className="page contact__grid">
        <aside className="contact__aside">
          <Chapter id="contact" titleId="contact-h" title={contact.title} lead={contact.lead} script="title" />
        </aside>

        <form className={`contact__form is-${status}`} onSubmit={submit} aria-busy={status === 'sending'} onChange={() => { if (status === 'sent' || status === 'error') setStatus('idle'); }} noValidate data-reveal data-light>
          <span className="contact__sweep" aria-hidden="true" />
          {field('name', 'Name', (p) => <input {...p} autoComplete="name" autoCapitalize="words" spellCheck={false} />)}
          {field('email', 'Email', (p) => <input {...p} type="email" inputMode="email" autoComplete="email" autoCapitalize="off" spellCheck={false} />)}
          {field('idea', contact.ideaLabel, (p) => <textarea {...p} rows={4} placeholder={contact.ideaPlaceholder} />)}
          {field('budget', contact.budgetLabel, (p) => <input {...p} inputMode="text" placeholder={contact.budgetPlaceholder} />, false)}
          <Choice disabled={busy} name="timeline" legend="Timeline" options={contact.timelines} initial={contact.timelines[3]} />
          <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
          <div className="field--wide contact__actions">
            {/* dimmed until the required fields are valid; pressing it then shows what is missing instead of sending */}
            <button className={`btn btn--primary contact__send${ready ? '' : ' is-disabled'}`} type="submit" disabled={busy} aria-disabled={!ready || undefined}>
              <span>{status === 'sending' ? contact.sending : contact.submit}</span><Icon name="contact" size={15} />
            </button>
            <p className="contact__status" role="status">
              {status === 'sent' && contact.sent}
              {status !== 'sent' && cooling && contact.cooldown}
              {status === 'error' && <>{contact.error}<br />{hasEmail ? <a href={mailto}>{contact.emailFallback}</a> : <a href={brand.links.linkedin} target="_blank" rel="noopener noreferrer">{contact.socialFallback}</a>}</>}
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
