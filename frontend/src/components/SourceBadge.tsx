import type { Source } from '../lib/types';

interface SourceBadgeProps {
  source: Source;
  className?: string;
}

export default function SourceBadge({ source, className = '' }: SourceBadgeProps) {
  const styles: Record<Source, string> = {
    live: 'badge-live',
    simulated: 'badge-simulated',
    lab: 'badge-lab',
  };

  const labels: Record<Source, string> = {
    live: 'Live',
    simulated: 'Simulated',
    lab: 'Lab',
  };

  return (
    <span className={`${styles[source]} ${className}`}>
      {source === 'live' && <span className="live-dot" />}
      {labels[source]}
    </span>
  );
}
