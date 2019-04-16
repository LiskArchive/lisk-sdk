#!/bin/bash

# Unofficial strict mode
set -euo pipefail
IFS=$'\n\t'

# Usage
# npm run clean

rm -rf .nyc_output/
rm -rf coverage/
rm -rf dist-node/
rm -rf lerna-debug.log
rm -rf npm-debug.log