import React from 'react';
import './LoadingSkeleton.css';

const LoadingSkeleton = ({ height, width, className = '' }) => {
    const style = {
        height: height || '100%',
        width: width || '100%',
    };

    return (
        <div className={`skeleton-card ${className}`} style={style}>
            <div className="skeleton-shimmer"></div>
        </div>
    );
};

export default LoadingSkeleton;
