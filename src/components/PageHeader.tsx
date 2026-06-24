interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: { text: string; variant: 'danger' | 'warning' | 'success' };
}

export default function PageHeader({ title, subtitle, badge }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-row">
        <h2>{title}</h2>
        {badge && <span className={`badge badge-${badge.variant}`}>{badge.text}</span>}
      </div>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
