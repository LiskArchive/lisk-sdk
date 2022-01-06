#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

COMMITISH=${1:-}

if [ "$( uname -m )" = "arm64" ]; then
  echo "ERROR: Only the x86_64 is supported at the moment."
  exit 2
fi

usage() {
  echo "$0 <commit-ish>"
}

if [ -z "$COMMITISH" ]; then
	usage
	exit 1
fi

set -x

WORKING_DIR="$( mktemp -d )"
git clone --depth 1 --branch "$COMMITISH" https://github.com/LiskHQ/lisk-sdk.git "$WORKING_DIR"

cd "$WORKING_DIR"
yarn
yarn build
yarn lint
yarn format

OTP_OPTS=""
if [ -n "$OTP" ]; then
	OTP_OPTS="--otp=$OTP"
fi
npx lerna publish --from-package $OTP_OPTS --yes
