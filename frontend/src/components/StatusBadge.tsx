import type { StationStatus } from '../lib/types';
import { statusLabel } from '../lib/api';
import { CheckCircle, AlertTriangle, XCircle, WifiOff } from 'lucide-react';

interface StatusBadgeProps {
  status: StationStatus;
  size?: 'sm' | 'md';
  className?: string;
}

const icons: Record<StationStatus, React.ReactNode> = {
  good: <CheckCircle size={12} />,
  warning: <AlertTriangle size={12} />,
  critical: <XCircle size={12} />,
  offline: <WifiOff size={12} />,
};

const badgeClass: Record<StationStatus, string> = {
  good: 'badge-good',
  warning: 'badge-warning',
  critical: 'badge-critical',
  offline: 'badge-offline',
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span className={`${badgeClass[status]} flex items-center gap-1 ${className}`}>
      {icons[status]}
      {statusLabel(status)}
    </span>
  );
}
