import { toolLogos } from '../content/toolLogos';
import { Icon } from './Icon';

/** Keep dark brand marks legible on the glass tiles. */
export function readable(hex: string) {
  const n = parseInt(hex, 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 70 ? `#${hex}` : '#e9eef6';
}

export function SkillLogo({ name }: { name: string }) {
  const logo = toolLogos[name];
  if (logo && 'path' in logo) return <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d={logo.path} fill={readable(logo.hex)} /></svg>;
  if (logo && 'src' in logo) return <img src={logo.src} width="24" height="24" alt="" loading="lazy" decoding="async" draggable={false} />;
  return <Icon name={logo && 'icon' in logo ? logo.icon : 'api'} size={24} />;
}
