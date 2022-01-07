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

WORKING_DIR="$( mktemp -d )"
function cleanup() {
	if [ -z $WORKING_DIR ]; then
		return
	fi
	rm -rf "$WORKING_DIR"
}
trap cleanup INT QUIT TERM EXIT

git clone --depth 1 --branch "$COMMITISH" https://github.com/LiskHQ/lisk-sdk.git "$WORKING_DIR"

if [ -e "$HOME/.nvm/nvm.sh" ]; then
	set +e; source "$HOME/.nvm/nvm.sh"; set -e
	NODEJS_VERSION="$( cat $( cd $( dirname ${BASH_SOURCE[0]} ) && pwd )/../.nvmrc )"
	nvm install "$NODEJS_VERSION"
	nvm use "$NODEJS_VERSION"
	npm install --global yarn
else
	echo "WARN: Not using nvm."
	echo "Make sure you are running nodejs version $NODEJS_VERSION and have installed yarn."
fi

cd "$WORKING_DIR"

set -x

yarn
yarn build
yarn lint
yarn format

OTP_OPTS=""
if [ -n "$OTP" ]; then
	OTP_OPTS="--otp=$OTP"
fi
npx lerna publish --from-package $OTP_OPTS --yes
