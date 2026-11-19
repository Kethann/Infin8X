/** All section copy. `[PLACEHOLDER: …]` = owner must write it. `[CONFIRM]` = seed from the brief, confirm before publishing. */
export type Accent = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet';
export const accentVar = (a: Accent) => `var(--s-${a})`;

/**
 * The page is the spectrum lobe: after the hero, the dispersed light travels down the page and every chapter
 * takes the next colour, red → violet. Order here = order on the page, in the navigation.
 */
export const chapters = [
  { id: 'about', label: 'About', accent: 'red' as Accent },
  { id: 'services', label: 'Services', accent: 'orange' as Accent },
  { id: 'process', label: 'Process', accent: 'yellow' as Accent },
  { id: 'projects', label: 'Work', accent: 'green' as Accent },
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
  statement: 'From the first sketch to launch.',
  philosophy: [
    'Understand the goal, the audience and what needs to change.',
    'Bring the interface, systems and visual identity together.',
    'Refine the details that make a product easier to use.',
  ],
  principleLabels: ['Idea', 'Craft', 'Detail'],
  /** milestone track, from the owner's own site (technical milestones only) */
  since: '2021',
  sinceLabel: 'Building since',
  journey: [
    { name: 'UI / UX design', text: 'Interfaces, flows & design systems' },
    { name: 'Full-stack & apps', text: 'React, Node, cloud & APIs' },
    { name: 'Robotics & AI', text: 'ROS, Arduino, sensors, vision models' },
    { name: 'Now', text: 'Websites and apps, from concept to launch' },
  ],
  body: 'We plan, design and build websites, apps and digital tools, with every decision shaped by your goals and the people using them.',
  accent: 'red' as Accent,
};

export const skills = {
  eyebrow: 'Skills',
  title: 'Tools behind the work.',
  lead: 'Explore our tools and skills across development, AI, automation and data analysis.',
  indexLabel: 'Explore by discipline',
  previewLabel: 'In focus',
  previewHint: 'Hover, focus or tap a skill to explore.',
  pauseMotion: 'Pause motion',
  resumeMotion: 'Play motion',
  footer: 'Chosen to suit the project.',
  footerLink: 'Explore the projects',
  accent: 'blue' as Accent,
};

export const services = {
  eyebrow: 'Services',
  title: 'What we can build together.',
  lead: 'From a new website to a custom tool, choose the support your project needs.',
  cta: 'Discuss your project',
  accent: 'orange' as Accent,
  items: [
    { name: 'Websites & web apps', icon: 'web' as const, accent: 'blue' as Accent, outcome: 'Fast, clear websites that help people find what they need.', points: ['Brand websites', 'Landing pages', 'Web apps', 'Performance & SEO'] },
    { name: 'Apps & software', icon: 'app' as const, accent: 'green' as Accent, outcome: 'Custom tools that connect your systems and simplify daily work.', points: ['Custom software', 'Dashboards', 'APIs & backends', 'Cloud deployment'] },
    { name: 'AI & automation', icon: 'ai' as const, accent: 'violet' as Accent, outcome: 'Assistants and automated workflows for the tasks that slow you down.', points: ['AI assistants', 'Workflow automation', 'Data pipelines', 'Robotics prototypes'] },
    { name: 'Motion & branding', icon: 'motion' as const, accent: 'red' as Accent, outcome: 'Intro animations and logo reveals that bring your brand to life.', points: ['Intro & logo animations', 'Logo & identity', 'Motion graphics', 'Social assets'] },
  ],
};

export const processSteps = {
  eyebrow: 'Process',
  title: 'From idea to launch.',
  lead: 'Six steps, with working previews and space for your feedback.',
  replay: 'Replay',
  stage: { idea: 'Idea', prism: 'Understanding', build: 'Plan & build', loop: 'Feedback', live: 'Live' },
  /** the key that explains the prism metaphor, shown above the diagram */
  legendTitle: 'How to read the light',
  legend: [
    { kind: 'white', term: 'White light', meaning: 'your idea' },
    { kind: 'prism', term: 'The prism', meaning: 'we understand it' },
    { kind: 'spectrum', term: 'The colours', meaning: 'design, code and content, in parallel' },
    { kind: 'loop', term: 'The loop', meaning: 'your feedback' },
    { kind: 'point', term: 'One point', meaning: 'live' },
  ],
  deliverableLabel: 'Deliverable',
  timeLabel: 'Typical time',
  accent: 'yellow' as Accent,
  steps: [
    { n: '01', name: 'Discover', text: 'Share the goal, the audience and what matters most to your project.', deliverable: 'Project brief', time: '[PLACEHOLDER: e.g. 1–2 days]' },
    { n: '02', name: 'Define', text: 'Agree on the scope, key features and constraints before work begins.', deliverable: 'Agreed scope', time: '[PLACEHOLDER]' },
    { n: '03', name: 'Plan', text: 'Set the design direction, technical approach, milestones and budget.', deliverable: 'Project plan', time: '[PLACEHOLDER]' },
    { n: '04', name: 'Build', text: 'Build in stages, with working previews for you to review.', deliverable: 'Working preview', time: '[PLACEHOLDER]' },
    { n: '05', name: 'Refine', text: 'Share feedback, review the changes and fine-tune the experience.', deliverable: 'Reviewed changes', time: '[PLACEHOLDER]' },
    { n: '06', name: 'Launch', text: 'Run the final checks, publish the project and hand it over.', deliverable: 'Launch & handover', time: '[PLACEHOLDER]' },
  ],
};

export const contact = {
  eyebrow: 'Contact',
  title: 'Let’s talk about your project.',
  lead: 'Tell us what you want to build, who it’s for and when you’d like to start.',
  direct: 'Prefer to write directly?',
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
};

export const work = {
  eyebrow: 'Work',
  title: 'Selected work.',
  lead: 'A selection of website, portfolio and robotics projects.',
  footer: 'Have a project in mind?',
  footerLink: 'Start a conversation',
  empty: 'No projects in this category yet.',
  emptyLink: 'View all projects',
  accent: 'green' as Accent,
};

export const footer = {
  closing: 'Every pixel matters.',
  cta: 'Start a project',
  top: 'Back to top',
};
