#!/bin/sh
set -eu
base=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
{ /usr/bin/sed 's/^export //' "$base/lib/core.js"; /bin/cat "$base/lib/tests.js"; } | /usr/bin/osascript -l JavaScript
{ /usr/bin/sed 's/^export //' "$base/lib/core.js"; /bin/cat "$base/lib/collect.js" "$base/lib/collector-tests.js"; } | /usr/bin/osascript -l JavaScript
