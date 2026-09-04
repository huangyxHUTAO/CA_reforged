// 阶段 1 占位：先确认 ca/modules 能 import 成功
// 真正的 Lit 组件在后续步骤
import { LitElement, html, css } from 'lit';

class CaApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      background: var(--md-sys-color-background);
      color: var(--md-sys-color-on-background);
      padding: 16px;
    }
    h1 { color: var(--md-sys-color-primary); }
  `;

  render() {
    return html`
      <h1>命令助手 · CA-Web</h1>
      <p>阶段 1 占位：引擎加载状态</p>
      <pre id="status">${this._status()}</pre>
    `;
  }

  _status() {
    const lines = [];
    lines.push('CA: ' + (typeof globalThis.CA));
    lines.push('Common: ' + (typeof globalThis.Common));
    lines.push('IntelliSense: ' + (typeof globalThis.IntelliSense));
    lines.push('Intl: ' + (typeof globalThis.Intl));
    lines.push('L: ' + (typeof globalThis.L));
    lines.push('G: ' + (typeof globalThis.G));
    lines.push('PWM: ' + (typeof globalThis.PWM));
    return lines.join('\n');
  }
}

customElements.define('ca-app', CaApp);
