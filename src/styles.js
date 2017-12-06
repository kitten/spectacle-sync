import styled from 'react-emotion';

export const ConnectionMenu = styled('div')`
  background-color: rgba(0, 0, 0, 0.8);
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

export const Wrapper = styled('div')`
  background-color: #111;
  padding: 40px;
  border-radius: 4px;
  box-shadow: 0 6px 40px rgba(0, 0, 0, 0.27);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

export const TokenInput = styled('input')`
  appearance: none;
  outline: none;
  border: none;
  border-radius: 0;

  background: rgba(255, 255, 255, 0);
  border-bottom: 2px solid palevioletred;
  font-size: 16px;
  text-transform: uppercase;
  line-height: 1.2;
  color: white;
  width: 300px;
  text-align: center;

  padding: 10px 15px;
  margin: 30px;
  transition: color 0.3s, background 0.3s, transform 0.3s;

  &:focus {
    border-bottom: 2px solid white;
  }

  &:disabled {
    background: white;
    color: palevioletred;
    transform: scale(1.1);
    border: 2px solid palevioletred;
  }
`;

export const Row = styled('div')`
  display: flex;
  flex-direction: row;
  justify-content: center;
`;

export const Button = styled('button')`
  appearance: none;
  outline: none;

  border: 2px solid palevioletred;
  background: palevioletred;
  color: white;
  cursor: pointer;
  width: 200px;
  height: 50px;
  font-size: 12px;
  text-transform: uppercase;
  text-align: center;
  border-radius: 6px;

  padding: 15px;
  margin: 10px 5px;

  transition: border 0.25s, background 0.25s, transform 0.1s;
  transform: translate3d(0, 0, 0);

  &:hover {
    background: white;
    color: palevioletred;
  }

  &:active {
    transform: scale(0.98) translate3d(0, 2px, 0);
    box-shadow: 0 3px 10px rgba(240, 240, 240, 0.2);
  }

  &:disabled {
    cursor: initial;
    opacity: 0.7;
    pointer-events: none;
  }
`;

export const StatusText = styled('span')`
  color: palevioletred;
  font-size: 24px;
  font-weight: 500;
  margin: 35px;
  text-align: center;
  text-transform: uppercase;
  line-height: 1;
  height: 24px;
`;

export const Status = styled('a')`
  display: block;
  position: fixed;
  left: 0;
  bottom: 0;
  text-decoration: none;

  cursor: pointer;
  padding: 3px 6px;
  background: black;
  color: white;
  line-height: 1.2;
  font-size: 16px;
`;
