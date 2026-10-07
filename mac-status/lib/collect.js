ObjC.import('Foundation');

function command(path, args) {
  try {
    var task = $.NSTask.alloc.init, pipe = $.NSPipe.pipe;
    task.launchPath = path; task.arguments = args || [];
    task.standardOutput = pipe;
    task.standardError = $.NSFileHandle.fileHandleWithNullDevice;
    task.launch;
    // Outputs are small. Poll with a deadline so failed system services cannot hang the widget.
    var deadline = Date.now() + 2500;
    while (task.running && Date.now() < deadline) $.NSThread.sleepForTimeInterval(0.02);
    if (task.running) { task.terminate; return null; }
    var data = pipe.fileHandleForReading.readDataToEndOfFile;
    return task.terminationStatus === 0 ? ObjC.unwrap($.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding)) : null;
  } catch (_) { return null; }
}

function plist(text) {
  if (!text) return null;
  try {
    var data = $(text).dataUsingEncoding($.NSUTF8StringEncoding);
    var value = $.NSPropertyListSerialization.propertyListWithDataOptionsFormatError(data, 0, null, null);
    var result = ObjC.deepUnwrap(value);
    return result && typeof result === 'object' && !Array.isArray(result) ? result : null;
  } catch (_) { return null; }
}

function run() {
  var mem = memory(command('/usr/sbin/sysctl', ['-n', 'hw.memsize']), command('/usr/bin/vm_stat'));
  var pressure = memoryPressure(command('/usr/sbin/sysctl', ['-n', 'kern.memorystatus_vm_pressure_level']));
  var info = plist(command('/usr/sbin/diskutil', ['info', '-plist', '/']));
  var disks = info && info.APFSContainerReference ? plist(command('/usr/sbin/diskutil', ['apfs', 'list', '-plist', info.APFSContainerReference])) : null;
  var interfaces = command('/sbin/ifconfig', ['-l']);
  var active = interfaces ? interfaces.trim().split(/\s+/).filter(function (name) {
    if (!/^en\d+$/.test(name)) return false;
    var state = command('/sbin/ifconfig', [name]);
    return state && /status: active\b/.test(state);
  }) : [];
  var net = network(command('/usr/sbin/netstat', ['-ibn']), active);
  return JSON.stringify({ timestamp: Date.now(), monotonic: Number($.NSProcessInfo.processInfo.systemUptime),
    memory: mem, pressure: pressure, storage: storage(info, disks), network: net });
}
