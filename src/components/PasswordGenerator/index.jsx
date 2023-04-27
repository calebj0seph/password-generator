import './PasswordGenerator.scss';
import React, { Component } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconCopy from 'static/iconCopy.svg';
import IconRegenerate from 'static/iconRegenerate.svg';
import isEqual from 'react-fast-compare';
import PasswordGeneratorUtil from 'util/PasswordGeneratorUtil';
import PropTypes from 'prop-types';

/**
 * Amount of time to wait to generate a password before giving up.
 */
const PASSWORD_GENERATION_TIMEOUT = 5;

/**
 * A component that generates passwords and displays them, with buttons to copy the password and
 * generate new passwords.
 */
class PasswordGenerator extends Component {
  constructor(props) {
    super(props);
    this.state = {
      password: '',
      loading: false,
      error: false,
      errorDialogOpen: false,
      errorMessage: null,
    };
    this.passwordInputRef = React.createRef();
    this.passwordGenerator = new PasswordGeneratorUtil();
    this.generationRequest = 0;
  }

  componentDidMount() {
    // Generate an initial password
    this.onGeneratePassword();
  }

  componentDidUpdate(prevProps) {
    // Regenerate the password if the options are changed
    const { options } = this.props;
    if (!isEqual(options, prevProps.options)) {
      this.onGeneratePassword();
    }
  }

  /**
   * Copies the current password to the user's clipboard.
   */
  onCopyPassword() {
    this.passwordInputRef.current.select();
    document.execCommand('copy');
    this.passwordInputRef.current.setSelectionRange(0, 0);
    this.passwordInputRef.current.blur();
  }

  /**
   * Starts generating a new password, displaying it when complete.
   */
  async onGeneratePassword() {
    const { options } = this.props;
    const request = this.generationRequest + 1;
    this.generationRequest = request;
    try {
      this.setState({
        password: '',
        loading: true,
        error: false,
      });
      const password = await this.passwordGenerator.generatePassword(
        options,
        PASSWORD_GENERATION_TIMEOUT,
      );
      if (request === this.generationRequest) {
        this.setState({
          password,
          loading: false,
        });
      }
    } catch (error) {
      if (error.name !== 'CancelError') {
        this.setState({
          password: '',
          loading: false,
          error: true,
        });
        this.setErrorDialogMessage(error.message);
        this.openErrorDialog();
      }
    }
  }

  /**
   * Sets the content of the error message dialog.
   */
  setErrorDialogMessage(message) {
    this.setState({
      errorMessage: message,
    });
  }

  /**
   * Opens the error message dialog window.
   */
  openErrorDialog() {
    this.setState({
      errorDialogOpen: true,
    });
  }

  /**
   * Closes the error message dialog window.
   */
  closeErrorDialog() {
    this.setState({
      errorDialogOpen: false,
    });
  }

  render() {
    const {
      password, loading, error, errorDialogOpen, errorMessage,
    } = this.state;
    return (
      <div className="password-generator">
        <input
          ref={this.passwordInputRef}
          className={`password${loading ? ' loading' : ''}${error ? ' error' : ''}`}
          type="text"
          readOnly
          value={(() => {
            if (error) {
              return 'Error';
            }
            if (loading) {
              return 'Generating...';
            }
            return password;
          })()}
        />
        <button
          type="button"
          title="Copy to clipboard"
          disabled={loading || error}
          onClick={() => this.onCopyPassword()}
        >
          <IconCopy className="icon" />
        </button>
        <button
          type="button"
          title="Regenerate"
          disabled={loading}
          onClick={() => this.onGeneratePassword()}
        >
          <IconRegenerate className="icon" />
        </button>
        <Dialog
          open={errorDialogOpen}
          onClose={() => this.closeErrorDialog()}
          aria-labelledby="scroll-dialog-title"
        >
          <DialogTitle id="scroll-dialog-title">
            Error
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {errorMessage}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => this.closeErrorDialog()} color="primary">
              Ok
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}

PasswordGenerator.propTypes = {
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
};

export default PasswordGenerator;
