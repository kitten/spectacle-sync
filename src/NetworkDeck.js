import React, { cloneElement, Component } from 'react';
import PropTypes from 'prop-types';

import Controller from 'spectacle/lib/utils/controller';
import Manager from 'spectacle/lib/components/manager';
import Deck from 'spectacle/lib/components/deck';

import NetworkSync from './NetworkSync';

class NetworkDeck extends Deck {
  static displayName = 'NetworkDeck';

  static propTypes = Object.assign({}, Deck.propTypes, {
    signalUri: PropTypes.string
  });

  state = {
    slaveActive: false
  };

  onManagerRef = ref => {
    this.manager = ref.getWrappedInstance !== undefined ? ref.getWrappedInstance() : ref;
  };

  onSlaveConnect = () => {
    // Remove keydown handlers
    window.removeEventListener('keydown', this.manager._handleKeyPress);

    // Detach touch event props
    if (this.manager.getTouchEvents !== this._getTouchEvents) {
      this.manager_getTouchEvents = this.manager._getTouchEvents;
      this.manager._getTouchEvents = this._getTouchEvents;
    }

    // NOTE: A rerender *must* be triggered for the event handlers
    this.setState({ slaveActive: true });
  };

  onSlaveDisconnect = () => {
    // Readd keydown handlers
    window.addEventListener('keydown', this.manager._handleKeyPress);

    // Reattach touch event props
    if (this.manager.getTouchEvents === this._getTouchEvents) {
      this.manager._getTouchEvents = this.manager_getTouchEvents;
    }

    // NOTE: A rerender *must* be triggered for the event handlers
    this.setState({ slaveActive: false });
  };

  _getTouchEvents() {
    return {};
  }

  render() {
    const providerChild = super.render();
    const controllerChild = providerChild.props.children;
    const { slaveActive } = this.state;

    return cloneElement(providerChild, {}, (
      cloneElement(controllerChild, {}, (
        <NetworkSync
          signalUri={this.props.signalUri}
          onSlaveConnect={this.onSlaveConnect}
          onSlaveDisconnect={this.onSlaveDisconnect}
        >
          <Manager
            {...this.props}
            ref={this.onManagerRef}
            autoplay={slaveActive ? false : this.props.autoplay}
            controls={slaveActive ? false : this.props.controls}
          >
            {this.props.children}
          </Manager>
        </NetworkSync>
      ))
    ));
  }
}

export default NetworkDeck;
