import type { Accent } from './sections';

export interface Project {
  slug: string;
  title: string;
  category: 'Web' | 'App' | 'AI & Robotics';
  accent: Accent;
  outcome: string;
  summary: string;
  tags: string[];
  cover: string;            // image path or '' for generated spectrum cover
  status: '[CONFIRM public / permission]';
  idea: string;
  delivered: string;
  timeline: { label: string; text: string }[];
  url?: string;
  /** short display name + discipline for the work index */
  name: string;
  discipline: string;
}

const tl = (idea: string, build: string, live: string) => [
  { label: 'Idea', text: idea }, { label: 'Understanding', text: '[PLACEHOLDER: what we learned]' },
  { label: 'Build', text: build }, { label: 'Delivered', text: live },
];

export const projects: Project[] = [
  { summary: 'A mobile ordering concept that takes café guests from a QR code to the menu.', slug: 'kaaya-cafe', name: 'Kaaya', discipline: 'QR ordering', title: 'Kaaya Cafe: QR ordering', category: 'Web', accent: 'orange',
    outcome: '[PLACEHOLDER: outcome, e.g. table orders without a waiter round-trip]',
    tags: ['React', 'QR', 'Mobile-first'], cover: '', status: '[CONFIRM public / permission]',
    idea: 'Let guests scan a QR code at the table and order straight from their phone.',
    delivered: '[PLACEHOLDER: delivered result]',
    timeline: tl('Scan, browse, order: no app install.', 'Mobile-first menu and ordering flow.', '[PLACEHOLDER: launch details]') },
  { summary: 'A studio website that brings its portfolio and visual identity together.', slug: 'dolly-design-studio', name: 'Dolly', discipline: 'Studio website', title: 'Dolly Design Studio website', category: 'Web', accent: 'red',
    outcome: '[PLACEHOLDER: outcome]', tags: ['Web design', 'Portfolio', 'SEO'], cover: '', status: '[CONFIRM public / permission]',
    idea: '[PLACEHOLDER: client idea]', delivered: '[PLACEHOLDER: delivered result]',
    timeline: tl('[PLACEHOLDER]', '[PLACEHOLDER]', '[PLACEHOLDER]') },
  { summary: 'An indoor delivery exploration using robot navigation, mapping and computer vision.', slug: 'delivery-robot-sn15', name: 'SN15', discipline: 'Robot navigation', title: 'Delivery robot navigation (SN15)', category: 'AI & Robotics', accent: 'violet',
    outcome: '[PLACEHOLDER: outcome, e.g. autonomous indoor navigation]', tags: ['ROS 2', 'Navigation', 'Computer vision'], cover: '', status: '[CONFIRM public / permission]',
    idea: 'A robot that can find its own way to deliver items indoors.', delivered: '[PLACEHOLDER: delivered result]',
    timeline: tl('Autonomous delivery indoors.', 'Mapping, localisation and path planning on ROS 2.', '[PLACEHOLDER]') },
  { summary: 'A portfolio concept that brings creative work, typography and motion together.', slug: 'amuse-portfolio', name: 'Amuse', discipline: 'Creative portfolio', title: 'Amuse portfolio', category: 'Web', accent: 'blue',
    outcome: '[PLACEHOLDER: outcome]', tags: ['Portfolio', 'Motion'], cover: '', status: '[CONFIRM public / permission]',
    idea: '[PLACEHOLDER]', delivered: '[PLACEHOLDER]', timeline: tl('[PLACEHOLDER]', '[PLACEHOLDER]', '[PLACEHOLDER]') },
];

export const categories = ['All', 'Web', 'App', 'AI & Robotics'] as const;
