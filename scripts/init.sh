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
mkdir -p "$packageDir/src"
mkdir -p "$packageDir/test"

cp "./templates/package.json.tmpl" "$packageDir/package.json"

templatesRoot=(
	"browsertest"
	"cypress"
	"scripts"
	"test"
	".npmignore"
	".npmrc"
	".nycrc"
	".prettierignore"
	".prettierrc.json"
	"cypress.json"
	"tslint.json"
	"tsconfig.json"
	"tsconfig.browsertest.json"
)

for i in "${templatesRoot[@]}"
do
	if [ ! -e "$packageDir/${i}" ];	then
		ln -vs "../../templates/$i.tmpl" "$packageDir/$i"
	fi
done

templatesTest=(
	"tslint.json"
	"tsconfig.json"
	"mocha.opts"
)

for i in "${templatesTest[@]}"
do
	if [ ! -e "$packageDir/test/${i}" ];	then
		ln -vs "../../templates/test/$i.tmpl" "$packageDir/test/$i"
	fi
done