import React, { Component } from 'react';
import { ConnectionMenu, Wrapper, TokenInput, Row, Button, StatusText, Status } from './styles';
import createSlaveManager from './SlaveManager';
import createMasterManager from './MasterManager';

const makeChannelName = token => `Spectacle:${token}`;

const initialState = {
  showConnectionMenu: true,
  isInputDisabled: false,
  isConnected: false,
  tokenInput: '',
  status: '',
  connectionStatus: ''
};

class NetworkSync extends Component {
  static defaultProps = {
    signalUri: 'https://spectacle-signalling.now.sh'
  };

  state = initialState;

  onClickClose = () => {
    this.setState({ showConnectionMenu: false });
  };

  onClickOpen = () => {
    this.setState({ showConnectionMenu: true });
  };

  onTokenChange = evt => {
    this.setState({ tokenInput: evt.target.value });
  };

  joinSession = () => {
    const { tokenInput } = this.state;

    if (tokenInput.length !== 6) {
      return this.setState({
        status: 'Invalid token 😢'
      });
    }

    this.setState({
      status: 'Connecting... 🌍',
      isInputDisabled: true
    });

    createSlaveManager({
      signalUri: this.props.signalUri,
      token: makeChannelName(tokenInput),
      setStatus: connectionStatus => this.setState({ connectionStatus })
    }).then(slaveManager => {
      this.setState({
        isConnected: true,
        status: 'Connected 🎉'
      });

      this.endSession = () => {
        slaveManager.destroy();
        this.endSession = undefined;
      };
    }).catch(err => {
      this.setState({
        isConnected: false,
        isInputDisabled: false,
        status: err.message
      });
    });
  };

  createSession = () => {
    const tokenInput = Math.random().toString(26).slice(-6).toUpperCase();

    this.setState({
      isInputDisabled: true,
      isConnected: true,
      tokenInput,
      status: 'Share the token with your viewers 📺'
    });

    createMasterManager({
      signalUri: this.props.signalUri,
      token: makeChannelName(tokenInput),
      setStatus: connectionStatus => this.setState({ connectionStatus })
    }).then(masterManager => {
      this.endSession = () => {
        masterManager.destroy();
        this.endSession = undefined;
      };
    }).catch(err => {
      this.setState({
        isConnected: false,
        isInputDisabled: false,
        status: err.message
      });
    });
  };

  disconnect = () => {
    if (this.endSession) {
      this.endSession();
    }

    this.setState(initialState);
  };

  componentWillUnmount() {
    if (this.endSession) {
      this.endSession();
    }
  }

  renderConnectionMenu() {
    const { isConnected } = this.state;

    return (
      <ConnectionMenu onClick={this.onClickClose}>
        <Wrapper onClick={evt => { evt.stopPropagation() }}>
          <TokenInput
            type="text"
            placeholder="enter session token here"
            onChange={this.onTokenChange}
            value={this.state.tokenInput}
            disabled={this.state.isInputDisabled}
          />

          <Row>
            {!isConnected && <Button onClick={this.joinSession}>Join Session</Button>}
            {!isConnected && <Button onClick={this.createSession}>Create Session</Button>}
            {isConnected && <Button onClick={this.disconnect}>Disconnect</Button>}
          </Row>

          <StatusText>
            {this.state.status}
          </StatusText>
        </Wrapper>
      </ConnectionMenu>
    );
  }

  renderStatus() {
    return this.state.connectionStatus ? (
      <Status onClick={this.onClickOpen}>
        {this.state.connectionStatus}
      </Status>
    ) : null;
  }

  render() {
    return (
      <div>
        {this.props.children}
        {this.state.showConnectionMenu && this.renderConnectionMenu()}
        {this.renderStatus()}
      </div>
    );
  }
}

export default NetworkSync;
