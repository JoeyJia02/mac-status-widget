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
const context = {exports: {}, React, require: name => {
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
console.log(checks + ' widget rendering tests passed');
