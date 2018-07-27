#!/bin/bash

# Unofficial strict mode
set -euo pipefail
IFS=$'\n\t'

packageName=${1:-}

ROOT_PACKAGE_NAME=$(jq --raw-output '.name' package.json)
if [ "$ROOT_PACKAGE_NAME" != "lisk-elements-monorepo" ]; then
	echo "Please use the command in the project root directory."
	exit 1
fi

if [ -z "$packageName" ] || [[ "$packageName" =~ [^a-zA-Z0-9-] ]]; then
	echo "Usage: npm run init -- PACKAGE_NAME"
	exit 1
fi

packageDir="./packages/$packageName"
# Just in case package folder doesn't exist yet.
mkdir -p "$packageDir"

templates=(
	"browsertest"
	"cypress"
	"scripts"
	".babelrc"
	".eslintignore"
	".npmignore"
	".npmrc"
	".nycrc"
	".prettierignore"
	".prettierrc.json"
	"cypress.json"
)

for i in "${templates[@]}"
do
	if [ ! -e "$packageDir/${i}" ];	then
		ln -vs "../../templates/$i.tmpl" "$packageDir/$i"
	fi
done
