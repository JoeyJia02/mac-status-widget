var verified = 0;
function assert(ok, label) { if (!ok) throw new Error(label); verified++; }
function run() {
  assert(command('/usr/bin/printf', ['%s', 'collector-ok']) === 'collector-ok', 'NSTask captures stdout');
  assert(command('/usr/bin/false') === null, 'nonzero exit is unknown');
  assert(command('/nonexistent/mac-status-command') === null, 'missing command is unknown');
  var xml = '<?xml version="1.0"?><plist version="1.0"><dict><key>CapacityFree</key><integer>400</integer></dict></plist>';
  assert(plist(xml).CapacityFree === 400, 'Foundation plist numeric conversion');
  assert(plist('invalid') === null, 'bad plist unknown');
  var before = Date.now();
  assert(command('/bin/sleep', ['5']) === null && Date.now() - before < 4500, 'command timeout');
  return verified + ' collector tests passed';
}
