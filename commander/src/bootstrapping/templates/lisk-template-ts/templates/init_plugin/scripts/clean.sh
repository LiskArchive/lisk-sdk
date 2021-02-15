# Unofficial strict mode
set -euo pipefail
IFS=$'\n\t'

# Usage
# npm run clean

rm -rf coverage/
rm -rf dist-node/
rm -rf lerna-debug.log
rm -rf npm-debug.log
