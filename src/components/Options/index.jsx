import './Options.scss';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SliderOption from 'components/SliderOption';
import SwitchOption from 'components/SwitchOption';
import SwitchTextOption from 'components/SwitchTextOption';

/**
 * A component that allows the user to set password generation options.
 */
class Options extends Component {
  /**
   * Updates the password length option to a new value.
   */
  onPasswordLengthChange(passwordLength) {
    const { onOptionsChange } = this.props;
    onOptionsChange({
      passwordLength,
    });
  }

  /**
   * Updates the minimum digit proportion option to a new value.
   */
  onMinDigitProportionChange(minDigitProportion) {
    const { onOptionsChange } = this.props;
    onOptionsChange({
      minDigitProportion: minDigitProportion / 100,
    });
  }

  /**
   * Updates the minimum symbol proportion option to a new value.
   */
  onMinSymbolProportionChange(minSymbolProportion) {
    const { onOptionsChange } = this.props;
    onOptionsChange({
      minSymbolProportion: minSymbolProportion / 100,
    });
  }

  /**
   * Updates the maximum case variance option to a new value.
   */
  onMaxCaseVarianceChange(maxCaseVariance) {
    const { onOptionsChange } = this.props;
    onOptionsChange({
      maxCaseVariance: maxCaseVariance / 100,
    });
  }

  /**
   * Updates the use uppercase option to a new value.
   */
  onUseUppercaseChange(useUppercase) {
    const { onOptionsChange } = this.props;
    onOptionsChange({
      useUppercase,
    });
  }

  /**
   * Updates the use lowercase option to a new value.
   */
  onUseLowercaseChange(useLowercase) {
    const { onOptionsChange } = this.props;
    onOptionsChange({
      useLowercase,
    });
  }

  /**
   * Updates the use digits option to a new value.
   */
  onUseDigitsChange(useDigits) {
    const { onOptionsChange } = this.props;
    onOptionsChange({
      useDigits,
    });
  }

  /**
   * Updates the use symbols option to a new value.
   */
  onUseSymbolsChange(useSymbols) {
    const { onOptionsChange } = this.props;
    onOptionsChange({
      useSymbols,
    });
  }

  /**
   * Updates the symbols option to a new value.
   */
  onSymbolsChange(symbols) {
    const { onOptionsChange } = this.props;
    onOptionsChange({
      symbols,
    });
  }

  render() {
    const { options } = this.props;
    return (
      <div className="options-container">
        <SliderOption
          min={6}
          max={64}
          step={1}
          value={options.passwordLength}
          onChange={value => this.onPasswordLengthChange(value)}
          valueFormatter={value => `${value}`}
          label="Password length"
          title="The length of the password in characters"
        />
        <SliderOption
          min={0}
          max={40}
          step={1}
          enabled={options.useDigits}
          value={Math.round(options.minDigitProportion * 100)}
          onChange={value => this.onMinDigitProportionChange(value)}
          valueFormatter={value => `${value}%`}
          label="Min. amount of digits"
          title="The minimum percentage of characters that must be digits"
        />
        <SliderOption
          min={0}
          max={40}
          step={1}
          enabled={options.useSymbols && options.symbols.length > 0}
          value={Math.round(options.minSymbolProportion * 100)}
          onChange={value => this.onMinSymbolProportionChange(value)}
          valueFormatter={value => `${value}%`}
          label="Min. amount of symbols"
          title="The minimum percentage of characters that must be symbols"
        />
        <SliderOption
          min={0}
          max={100}
          step={1}
          enabled={options.useLowercase && options.useUppercase}
          value={Math.round(options.maxCaseVariance * 100)}
          onChange={value => this.onMaxCaseVarianceChange(value)}
          valueFormatter={value => `${value}%`}
          label="Max. case variance"
          title="A lower value means there has to be a more equal number of uppercase and lowercase
                 letters"
        />
        <SwitchOption
          value={options.useUppercase}
          onChange={value => this.onUseUppercaseChange(value)}
          label="Use uppercase letters"
        />
        <SwitchOption
          value={options.useLowercase}
          onChange={value => this.onUseLowercaseChange(value)}
          label="Use lowercase letters"
        />
        <SwitchOption
          value={options.useDigits}
          onChange={value => this.onUseDigitsChange(value)}
          label="Use digits"
        />
        <SwitchTextOption
          value={options.useSymbols}
          onChange={value => this.onUseSymbolsChange(value)}
          textValue={options.symbols}
          onTextChange={value => this.onSymbolsChange(value)}
          label="Use symbols"
          textPlaceholder="!%@#"
          textHelperText="Enter symbols to use"
        />
      </div>
    );
  }
}

Options.propTypes = {
  options: PropTypes.shape({
    passwordLength: PropTypes.number.isRequired,
    minDigitProportion: PropTypes.number.isRequired,
    minSymbolProportion: PropTypes.number.isRequired,
    maxCaseVariance: PropTypes.number.isRequired,
    useLowercase: PropTypes.bool.isRequired,
    useUppercase: PropTypes.bool.isRequired,
    useDigits: PropTypes.bool.isRequired,
    useSymbols: PropTypes.bool.isRequired,
    symbols: PropTypes.string.isRequired,
  }).isRequired,
  onOptionsChange: PropTypes.func.isRequired,
};

export default Options;
