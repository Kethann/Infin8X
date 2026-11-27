/** All section copy. `[PLACEHOLDER: …]` = owner must write it. `[CONFIRM]` = seed from the brief, confirm before publishing. */
export type Accent = 'red' | 'orange' | 'yellow' | 'magenta' | 'blue' | 'violet';
export const accentVar = (a: Accent) => `var(--s-${a})`;

/**
 * The page is the spectrum lobe: after the hero, the dispersed light travels down the page and every chapter
 * takes the next colour, red → violet. Order here = order on the page, in the navigation.
 */
export const chapters = [
  { id: 'about', label: 'About', accent: 'red' as Accent },
  { id: 'services', label: 'Services', accent: 'orange' as Accent },
  { id: 'process', label: 'Process', accent: 'yellow' as Accent },
  { id: 'projects', label: 'Work', accent: 'magenta' as Accent },
  { id: 'skills', label: 'Skills', accent: 'blue' as Accent },
  { id: 'contact', label: 'Contact', accent: 'violet' as Accent },
] as const;
export type ChapterId = (typeof chapters)[number]['id'];
export const chapter = (id: ChapterId) => {
  const i = chapters.findIndex((c) => c.id === id);
  return { ...chapters[i], index: String(i + 1).padStart(2, '0'), total: String(chapters.length).padStart(2, '0') };
};
/** Unconfirmed details stay in the source until the owner supplies them. */
export const isTodo = (s: string) => s.startsWith('[PLACEHOLDER') || s.startsWith('[CONFIRM');

export const about = {
  eyebrow: 'About',
  title: 'Design and code, working together.',
  philosophy: [
    'Understand the goal, the audience and what needs to change.',
    'Bring the interface, systems and visual identity together.',
    'Refine the details that make a product easier to use.',
  ],
  principleLabels: ['Idea', 'Craft', 'Detail'],
  body: 'We plan, design and build websites, apps and digital tools, with every decision shaped by your goals and the people using them.',
  accent: 'red' as Accent,
};

export const skills = {
  eyebrow: 'Skills',
  title: 'Tools behind the work.',
  lead: 'Explore our tools and skills across development, AI, automation and data analysis.',
  statDisciplines: 'Disciplines',
  statTools: 'Tools & capabilities',
  /** factual notes under the numbers, filled from the data */
  statDisciplinesNote: (first: string, last: string) => `${first} to ${last}`,
  statToolsNote: (n: number) => `Across ${n} disciplines`,
  indexLabel: 'Explore by discipline',
  previewLabel: 'Skill preview',
  footer: 'Chosen to suit the project.',
  footerLink: 'Explore the projects',
  accent: 'blue' as Accent,
};

export const services = {
  eyebrow: 'Services',
  title: 'What we can build together.',
  lead: 'From a new website to a custom tool, choose the support your project needs.',
  cta: 'Discuss your project',
  showDetails: 'Show details',
  hideDetails: 'Hide details',
  accent: 'orange' as Accent,
  items: [
    { name: 'Websites & web apps', cta: 'Plan a website', icon: 'web' as const, accent: 'blue' as Accent, outcome: 'Fast, clear websites that help people find what they need.', points: ['Brand websites', 'Landing pages', 'Web apps', 'Performance & SEO'] },
    { name: 'Apps & software', cta: 'Scope an app', icon: 'app' as const, accent: 'magenta' as Accent, outcome: 'Custom tools that connect your systems and simplify daily work.', points: ['Custom software', 'Dashboards', 'APIs & backends', 'Cloud deployment'] },
    { name: 'AI & automation', cta: 'Automate a workflow', icon: 'ai' as const, accent: 'violet' as Accent, outcome: 'Assistants and automated workflows for the tasks that slow you down.', points: ['AI assistants', 'Workflow automation', 'Data pipelines'] },
    { name: 'Motion & branding', cta: 'Brief a motion project', icon: 'motion' as const, accent: 'red' as Accent, outcome: 'Intro animations and logo reveals that bring your brand to life.', points: ['Intro & logo animations', 'Logo & identity', 'Motion graphics', 'Social assets'] },
  ],
};

export const processSteps = {
  eyebrow: 'Process',
  title: 'From idea to launch.',
  lead: 'Six steps, with working previews and space for your feedback.',
  deliverableLabel: 'You get',
  timeLabel: 'Typical time',
  dialLabel: 'Process steps',
  stepLabel: 'Step',
  ofLabel: 'of',
  prevLabel: 'Previous step',
  nextLabel: 'Next step',
  hint: 'Hover or tap a step to read it',
  closeLabel: 'Close',
  accent: 'yellow' as Accent,
  steps: [
    { n: '01', name: 'Discover', text: 'You tell us the goal, who it’s for and what matters most.', deliverable: 'Project brief', time: '[PLACEHOLDER: e.g. 1–2 days]' },
    { n: '02', name: 'Define', text: 'Together we agree what’s included, the key features and any limits.', deliverable: 'Agreed scope', time: '[PLACEHOLDER]' },
    { n: '03', name: 'Plan', text: 'We set the look, the technology, the milestones and the budget.', deliverable: 'Project plan', time: '[PLACEHOLDER]' },
    { n: '04', name: 'Build', text: 'We build in stages and share working previews as we go.', deliverable: 'Working preview', time: '[PLACEHOLDER]' },
    { n: '05', name: 'Refine', text: 'You review and give feedback; we fine-tune the details.', deliverable: 'Reviewed changes', time: '[PLACEHOLDER]' },
    { n: '06', name: 'Launch', text: 'We run final checks, go live and hand everything over.', deliverable: 'Launch & handover', time: '[PLACEHOLDER]' },
  ],
};

export const contact = {
  eyebrow: 'Contact',
  title: 'Let’s talk about your project.',
  lead: 'Tell us what you want to build, who it’s for and when you’d like to start.',
  sending: 'Sending…',
  submit: 'Send message',
  sent: 'Message received. Thanks for telling us about your project.',
  accent: 'violet' as Accent,
  ideaLabel: 'Project details',
  ideaPlaceholder: 'What would you like to build or improve?',
  budgetLabel: 'Budget (optional)',
  budgetPlaceholder: 'Your range and currency, if known',
  error: 'Your message wasn’t sent. Your details are still in this form. Please try again.',
  emailFallback: 'Email your message instead',
  socialFallback: 'Contact us on LinkedIn',
  timelines: ['ASAP', '1–2 months', '3+ months', 'Flexible'],
  required: 'Required',
  /** shown under a field once it has been left, read out to screen readers */
  errors: {
    name: { required: 'Please enter your name.', short: 'Your name needs at least 2 letters.', long: 'Please keep your name under 80 characters.', format: 'Use letters only (spaces, hyphens and apostrophes are fine).' },
    email: { required: 'Please enter your email.', short: 'Please enter a full email address.', long: 'Please use a shorter email address.', format: 'Please enter a valid email, like name@example.com.' },
    idea: { required: 'Please tell us about your project.', short: 'Please add a little more detail (at least 20 characters).', long: 'Please keep it under 2000 characters.', spam: 'Please describe your project in a few words (not just links or repeated characters).' },
    budget: { long: 'Please keep the budget under 80 characters.', format: 'Use letters, numbers and currency symbols only.' },
  } as Record<string, Record<string, string>>,
  cooldown: 'Thanks. You can send another message in a minute.',
};

export const work = {
  eyebrow: 'Work',
  title: 'Selected work.',
  lead: 'A selection of websites and portfolios.',
  empty: 'No projects in this category yet.',
  emptyLink: 'View all projects',
  galleryHint: 'Pick a project. Step inside.',
  projectLink: 'View project',
  accent: 'magenta' as Accent,
};

export const footer = {
  closing: 'Every pixel matters',
};
