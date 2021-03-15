import './SwitchTextOption.scss';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import Input from '@material-ui/core/Input';
import PropTypes from 'prop-types';
import React from 'react';
import Switch from '@material-ui/core/Switch';

/**
 * Displays a boolean option controlled via a switch, along with a string option only editable when
 * the boolean option is true.
 */
const SwitchTextOption = ({
  value, onChange, textValue, onTextChange, label, textPlaceholder, textHelperText,
}) => (
  <div className="switch-text-option">
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
    <FormControl
      disabled={!value}
      margin="dense"
      fullWidth
    >
      <Input
        classes={{ input: 'text-input', root: 'text-field' }}
        value={textValue}
        placeholder={textPlaceholder}
        onChange={(event) => onTextChange(event.target.value)}
      />
      <FormHelperText className="text-field">
        {textHelperText}
      </FormHelperText>
    </FormControl>

  </div>
);

SwitchTextOption.defaultProps = {
  textPlaceholder: null,
  textHelperText: null,
};

SwitchTextOption.propTypes = {
  value: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  textValue: PropTypes.string.isRequired,
  onTextChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  textPlaceholder: PropTypes.string,
  textHelperText: PropTypes.string,
};

export default SwitchTextOption;
