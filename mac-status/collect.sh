#!/bin/sh
# Read-only, no cache, no daemons, no Python / Node / Xcode dependency.
set -eu
base=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
{ /usr/bin/sed 's/^export //' "$base/lib/core.js"; /bin/cat "$base/lib/collect.js"; } | /usr/bin/osascript -l JavaScript
