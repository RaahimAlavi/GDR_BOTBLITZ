import { Component } from 'react';
export default class PageLoadBoundary extends Component {
  state = {failed:false};
  static getDerivedStateFromError() { return {failed:true}; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="loading-screen"><div className="page-load-error"><h1>Couldn't open this page.</h1><p>Check your connection and try again. Scores saved on this device will sync when you return.</p><button className="primary-button" onClick={() => window.location.reload()}>TRY AGAIN</button></div></main>;
  }
}
