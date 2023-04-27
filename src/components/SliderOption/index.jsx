import './SliderOption.scss';
import PropTypes from 'prop-types';
import React from 'react';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';

/**
 * Displays a numerical option controlled via a slider.
 */
function SliderOption({
  min,
  max,
  step,
  enabled,
  value,
  onChange,
  valueFormatter,
  label,
  title,
}) {
  return (
    <div className="slider-option">
      <div className="option-label">
        <div className="option-name">
          {label}
        </div>
        <div className="option-value">
          {valueFormatter !== null && valueFormatter(value)}
        </div>
      </div>
      <Tooltip title={title} arrow>
        <Slider
          className="slider"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={!enabled}
          size="small"
          onChange={(event, newValue) => onChange(newValue)}
        />
      </Tooltip>
    </div>
  );
}

SliderOption.defaultProps = {
  step: null,
  enabled: true,
  valueFormatter: null,
};

SliderOption.propTypes = {
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  step: PropTypes.number,
  enabled: PropTypes.bool,
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  valueFormatter: PropTypes.func,
  label: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};

export default SliderOption;
