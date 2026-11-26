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
  { summary: 'A café and restaurant website that brings Kaaya’s atmosphere to the screen.', slug: 'kaaya-cafe', name: 'Kaaya', discipline: 'Café & restaurant', title: 'Kaaya — Café & restaurant website', category: 'Web', accent: 'orange',
    outcome: '[PLACEHOLDER: outcome]',
    tags: ['Hospitality', 'Web design', 'Mobile-first'], cover: '/work/kaaya.webp', coverMobile: '/work/kaaya-mobile.webp', coverTablet: '/work/kaaya-tablet.webp', status: '[CONFIRM public / permission]',
    idea: 'Give the café and restaurant a welcoming home online.',
    delivered: '[PLACEHOLDER: delivered result]',
    timeline: tl('Bring the café’s character online.', 'A website for a café and restaurant.', '[PLACEHOLDER: launch details]'), url: 'https://kaayacafe.pages.dev/' },
  { summary: 'An agency portfolio website for Dolly Design Studio, with its creative work at the centre.', slug: 'dolly-design-studio', name: 'Dolly', discipline: 'Agency portfolio', title: 'Dolly Design Studio — Agency portfolio website', category: 'Web', accent: 'red',
    outcome: '[PLACEHOLDER: outcome]', tags: ['Web design', 'Portfolio', 'SEO'], cover: '/work/dolly.webp', coverMobile: '/work/dolly-mobile.webp', coverTablet: '/work/dolly-tablet.webp', status: '[CONFIRM public / permission]',
    idea: 'Give the agency’s creative work a distinctive portfolio.', delivered: '[PLACEHOLDER: delivered result]',
    timeline: tl('[PLACEHOLDER]', '[PLACEHOLDER]', '[PLACEHOLDER]'), url: 'https://dollydstudio.pages.dev/' },
  { summary: 'A digital marketing agency website for UniCre8, bringing its services and creative work together.', slug: 'unicre8', name: 'UC8', discipline: 'Digital marketing agency', title: 'UC8 — Digital marketing agency website', category: 'Web', accent: 'orange',
    outcome: '[PLACEHOLDER: outcome]', tags: ['Digital marketing', 'Web design', 'Development'], cover: '/work/uc8.webp', coverMobile: '/work/uc8-mobile.webp', coverTablet: '/work/uc8-tablet.webp', status: '[CONFIRM public / permission]',
    idea: 'Create one home for the digital marketing agency’s services and work.', delivered: '[PLACEHOLDER: delivered result]',
    timeline: tl('[PLACEHOLDER]', '[PLACEHOLDER]', '[PLACEHOLDER]'), url: 'https://uc8.vercel.app/' },
  { summary: 'A creative portfolio website for Kethan, connecting design, engineering and experimentation.', slug: 'ka', name: 'KA', discipline: 'Creative portfolio', title: 'KA — Creative portfolio website', category: 'Web', accent: 'red',
    outcome: '[PLACEHOLDER: outcome]', tags: ['Portfolio', 'Motion', 'Development'], cover: '/work/kethan.webp', coverMobile: '/work/kethan-mobile.webp', coverTablet: '/work/kethan-tablet.webp', status: '[CONFIRM public / permission]',
    idea: 'One home for graphic design, UI/UX, full-stack and robotics work.', delivered: '[PLACEHOLDER: delivered result]',
    timeline: tl('[PLACEHOLDER]', '[PLACEHOLDER]', '[PLACEHOLDER]'), url: 'https://kethan.pages.dev/' },
];

export const categories = ['All', 'Web', 'App'] as const;
