import { About } from './About';
import { Services } from './Services';
import { Process } from './Process';
import { Projects } from './Projects';
import { Skills } from './Skills';
import { Contact } from './Contact';
import '../styles/studio.css';

/**
 * Everything below the hero, in its own chunk so it never delays the first paint.
 * Order follows the story and the spectrum (see `chapters` in content/sections.ts):
 * who we are → what we make → how → proof → the tools → your idea.
 */
export const SECTIONS = [About, Services, Process, Projects, Skills, Contact];
