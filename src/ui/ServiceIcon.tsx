import { serviceMap } from '../content';
import type { ServiceCategory } from '../content/types';

// AWS architecture-icon category colours.
export const CATEGORY_COLOR: Record<ServiceCategory, string> = {
  compute: '#ED7100', containers: '#ED7100', storage: '#7AA116', database: '#C925D1', networking: '#8C4FFF',
  security: '#DD344C', management: '#E7157B', integration: '#E7157B', analytics: '#8C4FFF', migration: '#01A88D',
  ml: '#01A88D', frontend: '#DD344C', cost: '#7AA116',
};
export const GENERIC_ICON: Record<string, string> = { user: '👤', users: '👥', internet: '🌐', onprem: '🏢', server: '🖥️', database: '🛢️', mobile: '📱', attacker: '🦹' };

export function iconInfo(id?: string) {
  if (!id) return { label: '', color: '#5a6678', emoji: '' };
  if (GENERIC_ICON[id]) return { label: '', color: 'transparent', emoji: GENERIC_ICON[id] };
  const s = serviceMap.get(id);
  return { label: s?.short ?? id.replace(/-/g, ' ').slice(0, 8).toUpperCase(), color: s ? CATEGORY_COLOR[s.category] : '#5a6678', emoji: '' };
}

export function ServiceIcon({ id, size = 40 }: { id: string; size?: number }) {
  const i = iconInfo(id);
  if (i.emoji) return <span style={{ fontSize: size * 0.7, width: size, height: size }} className="inline-grid place-items-center">{i.emoji}</span>;
  return (
    <span className="inline-grid place-items-center rounded-lg text-white font-bold text-center leading-none shrink-0"
      style={{ width: size, height: size, background: i.color, fontSize: Math.max(8, size / (i.label.length > 5 ? 5.2 : 3.6)) }}>
      {i.label}
    </span>
  );
}
