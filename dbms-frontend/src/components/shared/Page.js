import React from 'react';
import { useNavigate } from 'react-router-dom';

const Page = ({ 
  title, 
  subtitle, 
  actions, 
  backButton, 
  icon,
  breadcrumbs,
  stats,
  children 
}) => {
  const navigate = useNavigate();

  return (
    <div className="page-transition">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="breadcrumb fade-in-down">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {crumb.path ? (
                <a 
                  href="#" 
                  className="breadcrumb-item"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(crumb.path);
                  }}
                >
                  {crumb.icon && <i className={crumb.icon}></i>} {crumb.label}
                </a>
              ) : (
                <span className="breadcrumb-item active">
                  {crumb.icon && <i className={crumb.icon}></i>} {crumb.label}
                </span>
              )}
              {index < breadcrumbs.length - 1 && (
                <span className="breadcrumb-separator">/</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Back Button */}
      {backButton && (
        <button 
          className="back-button ripple-effect fade-in-left"
          onClick={() => navigate(backButton.to)}
        >
          <i className="fas fa-arrow-left"></i>
          {backButton.label || 'Back'}
        </button>
      )}

      {/* Page Header */}
      {(title || actions) && (
        <div className="d-flex align-items-center justify-content-between mb-4 mt-3 fade-in-up">
          <div>
            <h2 className="page-title d-flex align-items-center gap-3">
              {icon && <i className={`${icon} pulse-animation`}></i>}
              <span className="text-gradient">{title}</span>
            </h2>
            {subtitle && <div className="page-subtitle fade-in-up stagger-1">{subtitle}</div>}
          </div>
          {actions && <div className="d-flex gap-2 fade-in-right">{actions}</div>}
        </div>
      )}

      {/* Stats Cards */}
      {stats && stats.length > 0 && (
        <div className="stat-cards">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className={`stat-card card-hover fade-in-up stagger-${index + 1}`}
            >
              {stat.icon && <div className="stat-icon float-animation">{stat.icon}</div>}
              <div className="stat-value text-gradient">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              {stat.change && (
                <div className={`stat-change ${stat.change.type} bounce-animation`}>
                  <i className={`fas fa-arrow-${stat.change.type === 'positive' ? 'up' : 'down'}`}></i>
                  {stat.change.value}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="section-card scale-in">
        {children}
      </div>
    </div>
  );
};

export default Page;
