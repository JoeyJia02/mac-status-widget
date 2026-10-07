// Pure parsers; shared by Übersicht and the built-in JavaScript for Automation runtime.
// Read-only sysctl returns dispatch pressure flags, not an occupancy percentage.
export function memoryPressure(text) {
  if (typeof text !== 'string') return 'unknown';
  var value = text.trim();
  return value === '1' ? 'normal' : value === '2' ? 'warning' : value === '4' ? 'critical' : 'unknown';
}

export function storageStatus(metric, thresholds) {
  var t = thresholds || { warningRatio: 0.10, criticalRatio: 0.05,
    warningBytes: 20 * 1073741824, criticalBytes: 5 * 1073741824 };
  var numbers = [t.warningRatio, t.criticalRatio, t.warningBytes, t.criticalBytes];
  if (!metric || typeof metric.total !== 'number' || typeof metric.free !== 'number' ||
      !isFinite(metric.total) || !isFinite(metric.free) || !(metric.total > 0) ||
      metric.free < 0 || metric.free > metric.total ||
      !numbers.every(function (n) { return typeof n === 'number' && isFinite(n) && n >= 0; }) ||
      t.warningRatio > 1 || t.criticalRatio > t.warningRatio || t.criticalBytes > t.warningBytes) return 'unknown';
  if (metric.free <= Math.max(metric.total * t.criticalRatio, t.criticalBytes)) return 'critical';
  if (metric.free <= Math.max(metric.total * t.warningRatio, t.warningBytes)) return 'warning';
  return 'normal';
}

export function memory(totalText, vm) {
  var total = Number(totalText), page = /page size of (\d+) bytes/.exec(vm || '');
  function count(key) {
    var line = (vm || '').split('\n').filter(function (s) { return s.indexOf(key + ':') === 0; })[0];
    return line ? Number(line.split(':')[1].trim().replace(/\.$/, '')) : NaN;
  }
  // Physical resident estimate: anonymous - purgeable + wired + compressor footprint.
  // File cache is excluded; this is not Activity Monitor's private accounting.
  var anon = count('Anonymous pages'), purge = count('Pages purgeable');
  var wired = count('Pages wired down'), compressed = count('Pages occupied by compressor');
  var used = page && (Math.max(0, anon - purge) + wired + compressed) * Number(page[1]);
  if (!(total > 0) || !page || !isFinite(used) || used < 0 || used > total) return null;
  return { total: total, used: used, compressed: compressed * Number(page[1]) };
}

export function storage(info, listing) {
  if (!info || !listing || !info.APFSContainerReference) return null;
  var containers = listing.Containers || [];
  var c = containers.filter(function (item) { return item.ContainerReference === info.APFSContainerReference; })[0];
  if (!c || typeof c.CapacityCeiling !== 'number' || typeof c.CapacityFree !== 'number' ||
      !(c.CapacityCeiling > 0) || c.CapacityFree < 0 || c.CapacityFree > c.CapacityCeiling) return null;
  return { total: c.CapacityCeiling, used: c.CapacityCeiling - c.CapacityFree,
    free: c.CapacityFree, container: c.ContainerReference };
}

export function network(raw, active) {
  if (!raw || !active || !active.length) return null;
  var lines = raw.trim().split('\n'), head = lines.shift().trim().split(/\s+/);
  var incoming = head.indexOf('Ibytes'), outgoing = head.indexOf('Obytes');
  if (incoming < 0 || outgoing < 0) return null;
  var result = {};
  lines.forEach(function (line) {
    var p = line.trim().split(/\s+/), name = p[0];
    // Exactly one link-level row per active physical en interface, never IP/utun rows.
    if (!/^en\d+$/.test(name) || active.indexOf(name) < 0 || !/^<Link#\d+>$/.test(p[2])) return;
    var rx = Number(p[incoming]), tx = Number(p[outgoing]);
    if (isFinite(rx) && isFinite(tx) && rx >= 0 && tx >= 0) result[name] = { rx: rx, tx: tx };
  });
  return active.every(function (name) { return result[name]; }) ? result : null;
}

export function rates(previous, current) {
  if (!previous || !current || !previous.network || !current.network) return null;
  var elapsed = current.monotonic - previous.monotonic;
  var names = Object.keys(current.network).sort();
  if (!(elapsed > 0 && elapsed < 30) || !names.length ||
      names.join(',') !== Object.keys(previous.network).sort().join(',')) return null;
  var rx = 0, tx = 0;
  for (var i = 0; i < names.length; i++) {
    var a = previous.network[names[i]], b = current.network[names[i]];
    if (b.rx < a.rx || b.tx < a.tx) return null;
    rx += b.rx - a.rx; tx += b.tx - a.tx;
  }
  return { rx: rx / elapsed, tx: tx / elapsed };
}
