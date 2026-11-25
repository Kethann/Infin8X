/** Brand-level copy. Edit text here, not in components. `[PLACEHOLDER]` / `[CONFIRM]` = needs the owner's input. */
export const brand = {
  name: 'Infin8X',
  reading: 'Infinite Experience',
  coreLine: 'Turning ideas into digital reality',
  secondaryLine: 'Every pixel matters.',
  servicesLine: 'Websites, apps, AI and motion.',
  projectCta: 'Start a project',
  workCta: 'View our work',
  contactName: 'Kethan Artzz',
  email: '', // Add the studio email when ready.
  siteUrl: 'https://infin8x.pages.dev',
  links: {
    linkedin: 'https://www.linkedin.com/in/kethan-voleti-56a670226',
  },
} as const;

import { chapters } from './sections';

/** Primary navigation = every chapter except Contact, which has its own call-to-action button. */
export const nav = chapters.filter((c) => c.id !== 'contact').map((c) => ({ href: `#${c.id}`, label: c.label, id: c.id }));
export const navCta = brand.projectCta;
