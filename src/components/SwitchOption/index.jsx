import './SwitchOption.scss';
import PropTypes from 'prop-types';
import React from 'react';
import Switch from '@mui/material/Switch';

/**
 * Displays a boolean option controlled via a switch.
 */
function SwitchOption({ value, onChange, label }) {
  return (
    <div className="switch-option">
      <div className="option-label">
        <div className="option-name">
          {label}
        </div>
        <div className="option-value">
          <Switch
            edge="end"
            color="primary"
            checked={value}
            onChange={(event) => onChange(event.target.checked)}
          />
        </div>
      </div>
    </div>
  );
}

SwitchOption.propTypes = {
  value: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
};

export default SwitchOption;
