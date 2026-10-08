// Development-only rendering checks using the already installed Übersicht libraries.
// Never copied into the auto-executed widget directory.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');
const app = '/Applications/Übersicht.app/Contents/Resources/node_modules/';
const babel = require(app + '@babel/core');
const React = require(app + 'react');
const renderToStaticMarkup = require(app + 'react-dom/server').renderToStaticMarkup;
const transform = source => babel.transformSync(source, {
  babelrc: false, configFile: false,
  plugins: [app + '@babel/plugin-transform-modules-commonjs'],
  presets: [app + '@babel/preset-react']
}).code;
const root = path.resolve(__dirname, '../mac-status');
const coreContext = {exports: {}};
vm.runInNewContext(transform(fs.readFileSync(path.join(root, 'lib/core.js'), 'utf8')), coreContext);
const runCalls = [];
let runResult = Promise.resolve('');
const context = {exports: {}, React, require: name => {
  if (name === 'uebersicht') return {run: command => {runCalls.push(command); return runResult;}};
  assert.strictEqual(name, './lib/core.js'); return coreContext.exports;
}};
vm.runInNewContext(transform(fs.readFileSync(path.join(root, 'index.jsx'), 'utf8')), context);
const widget = context.exports;
const GiB = 1073741824;
const sample = pressure => ({timestamp: 1000, pressure,
  memory: {used: 15.9 * GiB, total:16 * GiB, compressed:2 * GiB},
  storage: {used:100 * GiB, total:500 * GiB, free:400 * GiB},
  network: {en0:{rx:1,tx:1}}});
let checks = 0;
function check(ok) {assert.ok(ok); checks++;}
function html(data) {return renderToStaticMarkup(widget.render(data));}
const normal = html({sample:sample('normal'), speed:{rx:1e9,tx:1e9}});
check(normal.includes('metric normal') && normal.includes('压力正常'));
check(!normal.includes('metric warning') && !normal.includes('metric critical'));
check(normal.includes('实时网速') && normal.includes('下行 / 上行') && !normal.includes('不代表互联网可达'));
check(html({sample:sample('warning'), speed:null}).includes('metric warning'));
check(html({sample:sample('critical'), speed:null}).includes('metric critical'));
const unknown = html({sample:sample(null), speed:null});
check(unknown.includes('metric unknown') && unknown.includes('压力未知'));
const low = sample('normal'); low.storage.free = 50 * GiB;
check(html({sample:low,speed:null}).includes('metric warning'));
low.storage.free = 25 * GiB;
check(html({sample:low,speed:null}).includes('metric critical'));
const missing = html({sample:null,speed:null});
check(missing.includes('压力未知') && missing.includes('空间未知') && missing.includes('速率未知'));
check(widget.className.includes('top: 240px; left: 32px; width: 292px;'));
check(widget.className.includes('.warning { --status-color: #e6bd6a; }') && widget.className.includes('.critical { --status-color: #ef8a88; }'));
check(normal.includes('<header class="normal">') && normal.includes('内存与存储状态正常'));
check(html({sample:sample('warning'), speed:null}).includes('<header class="warning">'));
check(html({sample:sample('critical'), speed:null}).includes('<header class="critical">'));
check(unknown.includes('<header class="unknown">'));
const partial = sample('normal'); partial.storage = null;
check(html({sample:partial,speed:null}).includes('<header class="unknown">'));
partial.pressure = 'warning';
check(html({sample:partial,speed:null}).includes('<header class="warning">'));
partial.pressure = 'critical';
check(html({sample:partial,speed:null}).includes('<header class="critical">'));
const diskAlarm = sample('unknown'); diskAlarm.storage.free = 50 * GiB;
check(html({sample:diskAlarm,speed:null}).includes('<header class="warning">'));
diskAlarm.storage.free = 25 * GiB;
check(html({sample:diskAlarm,speed:null}).includes('<header class="critical">'));
const mixed = sample('critical'); mixed.storage.free = 50 * GiB;
check(html({sample:mixed,speed:null}).includes('<header class="critical">'));
mixed.pressure = 'warning'; mixed.storage.free = 25 * GiB;
check(html({sample:mixed,speed:null}).includes('<header class="critical">'));
check(missing.includes('<header class="unknown">'));
check(widget.className.includes('background: var(--status-color)') && !widget.className.includes('border-radius: 50%; background: #96aac0;'));
check(normal.includes('role="button"') && normal.includes('tabindex="0"') && normal.includes('活动监视器 ↗'));
check(html({sample:sample('normal'),speed:null,launchError:true}).includes('role="alert"'));

async function interactionChecks() {
  const actions = [];
  const card = widget.render({sample:sample('normal'),speed:null}, action => actions.push(action));
  card.props.onClick();
  await Promise.resolve();
  check(runCalls.length === 1 && runCalls[0] === '/usr/bin/open -b com.apple.ActivityMonitor');
  check(actions.map(action => action.type).join(',') === 'OPEN_MONITOR_START,OPEN_MONITOR_SUCCESS');
  let prevented = 0;
  for (const key of ['Enter', ' ']) {
    card.props.onKeyDown({key,repeat:false,preventDefault() {prevented++;}});
    await Promise.resolve();
  }
  check(prevented === 2 && runCalls.length === 3);
  card.props.onKeyDown({key:'Enter',repeat:true,preventDefault() {prevented++;}});
  card.props.onKeyDown({key:'Tab',repeat:false,preventDefault() {throw new Error('Tab must retain focus navigation');}});
  check(runCalls.length === 3 && prevented === 3);
  runResult = Promise.reject(new Error('Application could not be opened'));
  card.props.onClick();
  await Promise.resolve();
  check(actions[actions.length - 1].type === 'OPEN_MONITOR_FAILED');
  const before = {sample:sample('normal'),speed:{rx:1,tx:2},launchError:false};
  const failed = widget.updateState({type:'OPEN_MONITOR_FAILED'}, before);
  check(failed.launchError && failed.sample === before.sample && failed.speed === before.speed);
  check(!widget.updateState({type:'OPEN_MONITOR_START'}, failed).launchError);
  check(!widget.updateState({type:'OPEN_MONITOR_SUCCESS'}, failed).launchError);
  const refreshed = widget.updateState({output:JSON.stringify(sample('normal'))}, failed);
  check(refreshed.launchError && refreshed.sample.pressure === 'normal');
  const collectionFailure = widget.updateState({error:new Error('Collection failed')}, failed);
  check(collectionFailure.sample === null && collectionFailure.speed === null && collectionFailure.launchError);
  console.log(checks + ' widget rendering and interaction tests passed');
}
interactionChecks().catch(error => {console.error(error); process.exitCode = 1;});
