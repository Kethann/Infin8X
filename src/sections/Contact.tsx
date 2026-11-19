import { useState, type CSSProperties, type FormEvent } from 'react';
import { contact, accentVar, isTodo } from '../content/sections';
import { brand } from '../content/site';
import { Chapter } from '../components/Chapter';
import { Icon } from '../components/Icon';

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
  const hasEmail = !!brand.email && !isTodo(brand.email);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'sending') return;
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const body = `Name: ${data.name}\nEmail: ${data.email}\nBudget: ${data.budget}\nTimeline: ${data.timeline}\n\n${data.idea}`;
    setMailto(hasEmail ? `mailto:${brand.email}?subject=${encodeURIComponent('New idea for Infin8X')}&body=${encodeURIComponent(body)}` : '');
    setStatus('sending');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data), signal: controller.signal });
      if (!res.ok || (await res.json()).ok !== true) throw new Error('Message was not accepted');
      setStatus('sent'); form.reset();
    } catch { setStatus('error'); }
    finally { window.clearTimeout(timeout); }
  };
  return (
    <section id="contact" className="section contact" data-chapter="contact" data-chapter-label="Contact"
      style={{ '--section-accent': accentVar(contact.accent) } as CSSProperties} aria-labelledby="contact-h">
      <div className="page contact__grid">
        <aside className="contact__aside">
          <Chapter id="contact" titleId="contact-h" title={contact.title} lead={contact.lead} />
          <div className="contact__direct" data-reveal>
            <p>{contact.direct}</p>
            <ul>
              {hasEmail && <li><a href={`mailto:${brand.email}`}>{brand.email}</a></li>}
              <li><a href={brand.links.linkedin} target="_blank" rel="noopener noreferrer">{brand.contactName} · LinkedIn <Icon name="arrow" size={14} /></a></li>
            </ul>
          </div>
        </aside>

        <form className={`contact__form is-${status}`} onSubmit={submit} aria-busy={status === 'sending'} onChange={() => { if (status === 'sent' || status === 'error') setStatus('idle'); }} noValidate data-reveal data-light>
          <span className="contact__sweep" aria-hidden="true" />
          <div className="field"><label htmlFor="f-name">Name</label><input disabled={status === 'sending'} id="f-name" name="name" required autoComplete="name" maxLength={120} /><i aria-hidden="true" /></div>
          <div className="field"><label htmlFor="f-email">Email</label><input disabled={status === 'sending'} id="f-email" name="email" type="email" required autoComplete="email" maxLength={200} /><i aria-hidden="true" /></div>
          <div className="field field--wide"><label htmlFor="f-idea">{contact.ideaLabel}</label><textarea disabled={status === 'sending'} id="f-idea" name="idea" required rows={5} maxLength={5000} placeholder={contact.ideaPlaceholder} /><i aria-hidden="true" /></div>
          <div className="field field--wide"><label htmlFor="f-budget">{contact.budgetLabel}</label><input disabled={status === 'sending'} id="f-budget" name="budget" maxLength={80} placeholder={contact.budgetPlaceholder} /><i aria-hidden="true" /></div>
          <Choice disabled={status === 'sending'} name="timeline" legend="Timeline" options={contact.timelines} initial={contact.timelines[3]} />
          <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
          <div className="field--wide contact__actions">
            <button className="btn btn--primary contact__send" type="submit" disabled={status === 'sending'}>
              <span>{status === 'sending' ? contact.sending : contact.submit}</span><Icon name="contact" size={15} />
            </button>
            <p className="contact__status" role="status">
              {status === 'sent' && contact.sent}
              {status === 'error' && <>{contact.error}<br />{hasEmail ? <a href={mailto}>{contact.emailFallback}</a> : <a href={brand.links.linkedin} target="_blank" rel="noopener noreferrer">{contact.socialFallback}</a>}</>}
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
