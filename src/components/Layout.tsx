import { NavLink } from 'react-router-dom';
import { useProject } from '../store/projectStore';
import StoreStatusBar from './StoreStatusBar';

const navSections = [
  {
    label: 'Overview',
    links: [
      { to: '/',               label: '📊 Executive Dashboard' },
      { to: '/progress-feed',  label: '📸 Site Progress Feed' },
      { to: '/s-curve',        label: 'S-Curve Analysis' },
      { to: '/delay',          label: 'Delay Analysis' },
    ],
  },
  {
    label: 'Contract & Claims',
    links: [
      { to: '/eot',         label: 'EOT Claim Management' },
      { to: '/financial',   label: 'Financial Monitoring' },
      { to: '/variations',  label: '📝 Variation Orders' },
      { to: '/boq',         label: '📋 Bill of Quantities' },
      { to: '/subcontractors', label: '🤝 Subcontractors' },
    ],
  },
  {
    label: 'Site Operations',
    links: [
      { to: '/quality',   label: 'Quality & NCR Tracking' },
      { to: '/resources', label: 'Resource Management' },
      { to: '/hse',       label: 'HSE Dashboard' },
      { to: '/risk',      label: 'Risk, Incidents & Problems' },
      { to: '/manpower',  label: '👷 Manpower & Payroll' },
      { to: '/concrete',  label: '🏗 Concrete Casting' },
    ],
  },
  {
    label: 'Intelligence',
    links: [
      { to: '/schedule',    label: 'Schedule & Drawings' },
      { to: '/drawings',    label: '📐 Drawing Register & RFIs' },
      { to: '/data-center', label: 'Project Data Center' },
      { to: '/reports',     label: 'AI Report Generator' },
      { to: '/alerts',      label: '🔔 Alerts & Notifications' },
    ],
  },
  {
    label: 'Configuration',
    links: [
      { to: '/org-chart', label: '👥 Organisation Chart' },
      { to: '/settings',  label: '⚙ Project Settings' },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const project = useProject();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">K</div>
          <div>
            <h1>KASSA PM</h1>
            <p>{project.contractId}</p>
          </div>
        </div>
        <div className="sidebar-project">
          <p className="sidebar-project-name">{project.name}</p>
          <p className="sidebar-project-loc">{project.location}</p>
        </div>
        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div className="nav-section" key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {section.links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === '/'}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  {l.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p className="sidebar-pm">{project.projectManager}</p>
          <p className="sidebar-co">{project.contractor}</p>
          <div className="sidebar-badges">
            <span className="badge badge-danger">{project.progress.status}</span>
            <span className="badge badge-warning">EOT {project.eot.claimedDays}d</span>
          </div>
        </div>
      </aside>

      <div className="main-panel">
        <header className="site-header">
          <div className="safety-stripe" aria-hidden="true" />
          <div className="site-header-inner">
            <div>
              <span className="site-header-label">Active Project</span>
              <strong>{project.contractId}</strong>
              <span className="site-header-sep">·</span>
              <span>{project.contractor}</span>
            </div>
            <div className="site-header-right">
              <span className="badge badge-warning">EOT {project.eot.claimedDays}d</span>
              <span className="badge badge-muted">Day {project.dates.daysElapsed}/{project.dates.contractDurationDays}</span>
              <span className={`badge badge-${project.progress.spi < 0.5 ? 'danger' : project.progress.spi < 0.8 ? 'warning' : 'success'}`}>
                SPI {project.progress.spi}
              </span>
            </div>
          </div>
        </header>
        <StoreStatusBar />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
