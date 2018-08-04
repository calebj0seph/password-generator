import './SliderOption.scss';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Slider from '@material-ui/lab/Slider';
import Tooltip from '@material-ui/core/Tooltip';

/**
 * Displays a numerical option controlled via a slider.
 */
class SliderOption extends Component {
  constructor(props) {
    super(props);
    this.state = {
      arrowRef: null,
    };
    this.setArrowRef = (arrowRef) => {
      this.setState({
        arrowRef,
      });
    };
  }

  render() {
    const {
      min, max, step, enabled, value, onChange, valueFormatter, label, title,
    } = this.props;
    const { arrowRef } = this.state;
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
        <Tooltip
          title={(
            <React.Fragment>
              {title}
              <span className="tooltip-arrow" ref={this.setArrowRef} />
            </React.Fragment>
          )}
          classes={{ popper: 'tooltip-popper' }}
          PopperProps={{
            popperOptions: {
              modifiers: {
                arrow: {
                  enabled: Boolean(arrowRef),
                  element: arrowRef,
                },
              },
            },
          }}
        >
          <Slider
            className="slider"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={!enabled}
            onChange={(event, newValue) => onChange(newValue)}
          />
        </Tooltip>
      </div>
    );
  }
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
