import { useEffect } from 'react';
import { Skills } from '../sections/Skills';
import '../styles/studio.css';

/** Skills lives on its own route, reached from the navigation only. */
export default function SkillsPage() {
  useEffect(() => { document.title = 'Skills | Infin8X'; }, []);
  return <div className="skills-page"><Skills /></div>;
}
