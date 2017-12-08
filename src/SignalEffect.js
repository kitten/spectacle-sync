import React, { Component } from 'react';
import styled, { keyframes } from 'react-emotion';

const Canvas = styled('div')`
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;
  z-index: 10000;

  pointer-events: none;
`;

const signalEffect = keyframes`
  0% {
    width: 10px;
    height: 10px;
    transform: translate3d(-5px, -5px, 0);
    opacity: 0;
  }

  50% {
    width: 110px;
    height: 110px;
    transform: translate3d(-55px, -55px, 0);
    opacity: 0.8;
  }

  100% {
    width: 10px;
    height: 10px;
    transform: translate3d(-5px, -5px, 0);
    opacity: 0.05;
  }
`;

const Signal = styled('div')`
  display: block;
  position: absolute;
  left: ${p => p.x * 100}%;
  top: ${p => p.y * 100}%;

  transform: translate3d(0, 0, 0);
  will-change: width, height, transform;

  border-radius: 50%;
  border: 1px solid white;
  box-shadow: 0 0 0 1px black;
  opacity: 0;

  animation-duration: 0.9s;
  animation-iteration-count: 1;
  animation-name: ${signalEffect};
  animation-timing-function: ease-in;
`;

class SignalEffect extends Component {
  state = {
    ripples: []
  };

  index = 0;

  componentDidMount() {
    if (this.props.produceSignals) {
      this.attachEvents();
    }
  }

  componentWillReceiveProps({ produceSignals }) {
    const isDiff = produceSignals !== this.props.produceSignals;

    if (isDiff && produceSignals) {
      this.attachEvents();
    } else if (isDiff) {
      this.detachEvents();
    }
  }

  componentWillUnmount() {
    this.detachEvents();
  }

  attachEvents = () => {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousedown', this.onClick);
  };

  detachEvents = () => {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousedown', this.onClick);
  };

  onRef = ref => {
    if (ref) {
      this.canvas = ref;
      this.dimensions = ref.getBoundingClientRect();
    }
  };

  onResize = () => {
    if (this.canvas) {
      this.dimensions = this.canvas.getBoundingClientRect();
    }
  };

  onClick = ({ clientX, clientY }) => {
    const { width, height } = this.dimensions;
    const relativeX = clientX / width;
    const relativeY = clientY / height;

    this.startRipple(relativeX, relativeY);

    if (this.props.onTrigger) {
      this.props.onTrigger({ relativeX, relativeY });
    }
  };

  shiftRipple = () => {
    const ripples = this.state.ripples.slice(1);
    this.setState({ ripples });
  };

  startRipple = (x, y) => {
    const key = this.index++;
    const ripple = { key, x, y };
    const ripples = this.state.ripples.concat(ripple);
    this.setState({ ripples });
  };

  render() {
    return (
      <Canvas innerRef={this.onRef}>
        {this.state.ripples.map(({ key, x, y }) => (
          <Signal key={key} x={x} y={y} onAnimationEnd={this.shiftRipple} />
        ))}
      </Canvas>
    );
  }
}

export default SignalEffect;
