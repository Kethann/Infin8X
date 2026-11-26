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
  /** the same site captured at phone (390×844) and tablet (834×1112) sizes: the Work split screen shows the one that fits */
  coverMobile?: string;
  coverTablet?: string;
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
    tags: ['React', 'QR', 'Mobile-first'], cover: '/work/kaaya.webp', coverMobile: '/work/kaaya-mobile.webp', coverTablet: '/work/kaaya-tablet.webp', status: '[CONFIRM public / permission]',
    idea: 'Let guests scan a QR code at the table and order straight from their phone.',
    delivered: '[PLACEHOLDER: delivered result]',
    timeline: tl('Scan, browse, order: no app install.', 'Mobile-first menu and ordering flow.', '[PLACEHOLDER: launch details]'), url: 'https://kaayacafe.pages.dev/' },
  { summary: 'The website for Dolly Design Studio, a film poster and title design studio.', slug: 'dolly-design-studio', name: 'Dolly', discipline: 'Studio website', title: 'Dolly Design Studio website', category: 'Web', accent: 'red',
    outcome: '[PLACEHOLDER: outcome]', tags: ['Web design', 'Portfolio', 'SEO'], cover: '/work/dolly.webp', coverMobile: '/work/dolly-mobile.webp', coverTablet: '/work/dolly-tablet.webp', status: '[CONFIRM public / permission]',
    idea: 'Present a film publicity studio’s posters, title design, typography and logos.', delivered: '[PLACEHOLDER: delivered result]',
    timeline: tl('[PLACEHOLDER]', '[PLACEHOLDER]', '[PLACEHOLDER]'), url: 'https://dollydstudio.pages.dev/' },
  { summary: 'The website for UniCre8, a digital marketing, content and web studio.', slug: 'unicre8', name: 'UC8', discipline: 'Studio website', title: 'UniCre8 studio website', category: 'Web', accent: 'orange',
    outcome: '[PLACEHOLDER: outcome]', tags: ['Web design', 'Development', 'Motion'], cover: '/work/uc8.webp', coverMobile: '/work/uc8-mobile.webp', coverTablet: '/work/uc8-tablet.webp', status: '[CONFIRM public / permission]',
    idea: 'One site for a studio that handles marketing, content and web in one place.', delivered: '[PLACEHOLDER: delivered result]',
    timeline: tl('[PLACEHOLDER]', '[PLACEHOLDER]', '[PLACEHOLDER]'), url: 'https://uc8.vercel.app/' },
  { summary: 'Kethan’s own portfolio, where design, engineering and robotics work sit together.', slug: 'ka', name: 'KA', discipline: 'Personal portfolio', title: 'KA portfolio', category: 'Web', accent: 'red',
    outcome: '[PLACEHOLDER: outcome]', tags: ['Portfolio', 'Motion', 'Development'], cover: '/work/kethan.webp', coverMobile: '/work/kethan-mobile.webp', coverTablet: '/work/kethan-tablet.webp', status: '[CONFIRM public / permission]',
    idea: 'One home for graphic design, UI/UX, full-stack and robotics work.', delivered: '[PLACEHOLDER: delivered result]',
    timeline: tl('[PLACEHOLDER]', '[PLACEHOLDER]', '[PLACEHOLDER]'), url: 'https://kethan.pages.dev/' },
];

export const categories = ['All', 'Web', 'App'] as const;
