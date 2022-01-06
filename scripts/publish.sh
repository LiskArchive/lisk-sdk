#!/bin/bash

# Unofficial strict mode
set -euo pipefail
IFS=$'\n\t'

TAG=${1:-}

# Ask for commit/tag if not given
if [ "$TAG" == "" ]; then
	echo "Please enter github tag to publish"
	read TAG
fi

if [ "$TAG" == "" ]; then
	echo "Tag must be specified as the first argument or entered manually"
	exit 1
fi

# Clean working directory if exist
WORKING_DIR="/tmp/lisk-sdk-publish/$TAG"
echo "Working dir is $WORKING_DIR"

if [ -d "$WORKING_DIR" ]; then rm -Rf $WORKING_DIR; fi
# Create working dir
mkdir -p $WORKING_DIR

# Clone the commit
git clone --depth 1 --branch $TAG https://github.com/LiskHQ/lisk-sdk.git $WORKING_DIR

cd $WORKING_DIR

yarn
yarn build
yarn lint
yarn format


echo "Please enter OTP"
read OTP

npx lerna publish --from-package --otp=$OTP --yes
