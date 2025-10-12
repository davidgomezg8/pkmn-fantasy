
import React from 'react';

interface HealthBarProps {
  currentHp: number;
  maxHp: number;
}

const HealthBar: React.FC<HealthBarProps> = ({ currentHp, maxHp }) => {
  const percentage = (currentHp / maxHp) * 100;
  const barColor = percentage > 50 ? 'bg-success' : percentage > 20 ? 'bg-warning' : 'bg-danger';

  return (
    <div className="progress" style={{ height: '10px' }}>
      <div
        className={`progress-bar ${barColor}`}
        role="progressbar"
        style={{ width: `${percentage}%` }}
        aria-valuenow={currentHp}
        aria-valuemin={0}
        aria-valuemax={maxHp}
      ></div>
    </div>
  );
};

export default HealthBar;
