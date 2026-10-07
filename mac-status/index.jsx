import * as core from './lib/core.js';

// Low-free-space thresholds. Either ratio or absolute capacity triggers the level.
const storageThresholds = { warningRatio: 0.10, criticalRatio: 0.05,
  warningBytes: 20 * 1073741824, criticalBytes: 5 * 1073741824 };
const pressureLabels = { normal: '压力正常', warning: '压力偏高', critical: '压力严重', unknown: '压力未知' };
const storageLabels = { normal: '空间充足', warning: '空间偏低', critical: '空间不足', unknown: '空间未知' };

// Command paths are relative to Übersicht's widget root, not this JSX file.
export const command = '/bin/sh mac-status/collect.sh';
export const refreshFrequency = 5000;
export const initialState = { sample: null, speed: null };
export const updateState = (event, state) => {
  if (event.error || !event.output) return initialState;
  try {
    const sample = JSON.parse(event.output);
    if (!sample || typeof sample.timestamp !== 'number') return initialState;
    return { sample, speed: core.rates(state.sample, sample) };
  } catch (_) { return initialState; }
};

const size = n => Number.isFinite(n) ? `${(n / 1073741824).toFixed(1)} GiB` : '未知';
const speed = n => Number.isFinite(n) ? (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MiB/s` : `${(n / 1024).toFixed(1)} KiB/s`) : '未知';
const meter = metric => metric && <div className="track"><div style={{width: `${Math.min(100, metric.used / metric.total * 100)}%`}} /></div>;

export const render = ({sample, speed: rate}) => {
  const m = sample && sample.memory, d = sample && sample.storage;
  const pressure = sample && Object.prototype.hasOwnProperty.call(pressureLabels, sample.pressure) ? sample.pressure : 'unknown';
  const diskStatus = core.storageStatus(d, storageThresholds);
  return <section aria-label="Mac 系统状态">
    <header><span className="dot"/> MAC 状态 <small>每 5 秒采样</small></header>
    <div className={`metric ${pressure}`}><label>内存 <em className="status">{pressureLabels[pressure]}</em></label>
      <strong>{m ? size(m.used) : '未知'} <span>{m ? `/ ${size(m.total)}` : ''}</span></strong>
      {meter(m)}<p>{m ? `驻留估算 · 压缩 ${size(m.compressed)}` : '无法读取内存指标'}</p></div>
    <div className={`metric ${diskStatus}`}><label>存储 <em className="status">{storageLabels[diskStatus]}</em></label>
      <strong>{d ? size(d.free) : '未知'} <span>{d ? '可用' : ''}</span></strong>
      {meter(d)}<p>{d ? `APFS · 已分配 ${size(d.used)} / ${size(d.total)}` : '无法读取容器容量'}</p></div>
    <div className="metric"><label>实时网速 <em>下行 / 上行</em></label>
      <div className="network"><div><b>↓</b> {speed(rate && rate.rx)}</div><div><b>↑</b> {speed(rate && rate.tx)}</div></div>
      <p>{sample && sample.network ? `${Object.keys(sample.network).join(' + ')}${rate ? '' : ' · 等待连续采样'}` : '离线或无法读取 · 速率未知'}</p></div>
    <footer>{sample ? `采样时间 ${new Date(sample.timestamp).toLocaleTimeString('zh-CN', {hour12:false})}` : '等待系统数据'}</footer>
  </section>;
};

export const className = `
  top: 240px; left: 32px; width: 292px; color: #eef2f6;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13px; font-variant-numeric: tabular-nums;
  section { background: rgba(22,27,34,.90); border: 1px solid rgba(255,255,255,.13); border-radius: 22px; padding: 22px; box-shadow: 0 16px 45px #0003; }
  header { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: #96aac0; }
  small { margin-left: auto; font-size: 10px; color: #a5aebc; letter-spacing: 0; }
  .metric { margin-top: 22px; }
  label { display: flex; justify-content: space-between; margin-bottom: 9px; }
  em { color: #a5aebc; font-size: 10px; font-style: normal; }
  strong { font-size: 24px; font-weight: 550; letter-spacing: -.5px; }
  strong span { color: #a5aebc; font-size: 12px; font-weight: 400; }
  .track { height: 4px; border-radius: 3px; background: #ffffff16; margin-top: 10px; overflow: hidden; }
  .metric { --status-color: #96aac0; }
  .normal { --status-color: #87bea9; }
  .warning { --status-color: #e6bd6a; }
  .critical { --status-color: #ef8a88; }
  .status { color: var(--status-color); }
  .warning strong, .critical strong { color: var(--status-color); }
  .track > div { height: 100%; background: var(--status-color); border-radius: 3px; }
  p { margin: 8px 0 0; color: #a5aebc; font-size: 10px; }
  .network { display: flex; justify-content: space-between; gap: 10px; font-size: 16px; }
  b { color: #87bea9; font-weight: 400; }
  footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #ffffff12; color: #8994a4; font-size: 10px; }
`;
