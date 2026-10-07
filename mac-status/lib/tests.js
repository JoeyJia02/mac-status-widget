var passed = 0;
function check(ok, name) { if (!ok) throw new Error(name); passed++; }
var vm = 'Mach Virtual Memory Statistics: (page size of 16384 bytes)\nAnonymous pages: 100.\nPages purgeable: 20.\nPages wired down: 30.\nPages occupied by compressor: 40.';
check(memory('10000000', vm).used === 150 * 16384, 'physical compressor footprint');
check(memory('', vm) === null, 'missing total');
check(memory('10000000', '') === null, 'missing vm counters');
check(memory('1', vm) === null, 'inconsistent memory snapshot');
var info = {APFSContainerReference: 'disk3'};
var disks = {Containers: [{ContainerReference:'disk3',CapacityCeiling:1000,CapacityFree:400,Volumes:[{CapacityInUse:200},{CapacityInUse:200}]}]};
check(storage(info, disks).used === 600, 'single APFS container, no volume sum');
check(storage({APFSContainerReference:'disk9'}, disks) === null, 'no unrelated container fallback');
check(storage(null, disks) === null, 'failed diskutil');
var raw = 'Name Mtu Network Address Ipkts Ierrs Ibytes Opkts Oerrs Obytes Coll\nen0 1500 <Link#6> aa 1 0 100 1 0 200 0\nen0 1500 192.0.2 192.0.2.1 1 0 100 1 0 200 0\nutun0 1500 <Link#7> aa 1 0 900 1 0 900 0\nen1 1500 <Link#8> bb 1 0 300 1 0 400 0';
var net = network(raw, ['en0']);
check(Object.keys(net).length === 1 && net.en0.rx === 100, 'no tunnel or IP duplicate');
check(network(raw, []) === null, 'offline unknown');
check(network(raw, ['en2']) === null, 'missing active counter unknown');
check(network('command failed', ['en0']) === null, 'malformed netstat unknown');
var a = {monotonic:10,network:net};
var b = {monotonic:15,network:{en0:{rx:600,tx:1200}}};
check(rates(a,b).rx === 100 && rates(a,b).tx === 200, 'elapsed byte deltas');
check(rates(null,b) === null, 'warmup');
check(rates(b,a) === null, 'reversed time');
check(rates(b,{monotonic:20,network:net}) === null, 'counter reset');
check(rates(a,{monotonic:50,network:b.network}) === null, 'sleep/stale interval');
check(rates(a,{monotonic:15,network:{en1:{rx:600,tx:1200}}}) === null, 'interface switch');
check(memoryPressure('1\n') === 'normal', 'system pressure normal');
check(memoryPressure('2') === 'warning', 'system pressure warning');
check(memoryPressure('4') === 'critical', 'system pressure critical');
[null, undefined, '', '0', '3', '8', '2.0', 'Operation not permitted'].forEach(function (value) {
  check(memoryPressure(value) === 'unknown', 'unrecognized pressure neutral: ' + value);
});
var GiB = 1073741824;
function disk(total, free) { return {total: total * GiB, free: free * GiB}; }
check(storageStatus(disk(500, 51)) === 'normal', 'above ratio warning');
check(storageStatus(disk(500, 50)) === 'warning', 'ratio warning boundary inclusive');
check(storageStatus(disk(500, 25.001)) === 'warning', 'above ratio critical');
check(storageStatus(disk(500, 25)) === 'critical', 'ratio critical boundary inclusive');
check(storageStatus(disk(100, 20.001)) === 'normal', 'above absolute warning');
check(storageStatus(disk(100, 20)) === 'warning', 'absolute warning boundary inclusive');
check(storageStatus(disk(50, 5.001)) === 'warning', 'above absolute critical');
check(storageStatus(disk(50, 5)) === 'critical', 'absolute critical boundary inclusive');
check(storageStatus(disk(500, 0)) === 'critical', 'zero free');
[null, {total:0,free:0}, {total:100,free:-1}, {total:100,free:101},
  {total:100,free:null}, {total:Infinity,free:1}, {total:100,free:NaN}].forEach(function (value) {
  check(storageStatus(value) === 'unknown', 'invalid capacity neutral: ' + JSON.stringify(value));
});
var custom = {warningRatio:.20,criticalRatio:.10,warningBytes:0,criticalBytes:0};
check(storageStatus(disk(100,20), custom) === 'warning' && storageStatus(disk(100,10), custom) === 'critical', 'configurable thresholds');
check(storageStatus(disk(100,50), {warningRatio:.1,criticalRatio:.2,warningBytes:0,criticalBytes:0}) === 'unknown', 'inverted thresholds neutral');
function run() { return passed + ' tests passed'; }
