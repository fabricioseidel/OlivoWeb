import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'primary' | 'secondary' | 'info';

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20',
  warning: 'bg-amber-100 text-amber-700 ring-1 ring-amber-600/20',
  error: 'bg-red-100 text-red-700 ring-1 ring-red-600/20',
  primary: 'bg-emerald-600 text-white shadow-sm',
  secondary: 'bg-gray-100 text-gray-700 ring-1 ring-gray-300',
  info: 'bg-blue-100 text-blue-700 ring-1 ring-blue-600/20',
};

export default function Badge({ children, variant = 'secondary', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Export variant-specific components for convenience
export function SuccessBadge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Badge variant="success" className={className}>{children}</Badge>;
}

export function WarningBadge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Badge variant="warning" className={className}>{children}</Badge>;
}

export function ErrorBadge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Badge variant="error" className={className}>{children}</Badge>;
}

export function PrimaryBadge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Badge variant="primary" className={className}>{children}</Badge>;
}
