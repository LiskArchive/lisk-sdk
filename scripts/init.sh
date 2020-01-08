#!/bin/bash

# Unofficial strict mode
set -euo pipefail
IFS=$'\n\t'

packageName=${1:-}
port=${2:-}
browserPackageName=${packageName}

ROOT_PACKAGE_NAME=$(jq --raw-output '.name' package.json)
if [ "$ROOT_PACKAGE_NAME" != "lisk-sdk-mono-repo" ]; then
	echo "Please use the command in the project root directory."
	exit 1
fi

if [ -z "$packageName" ] || [[ "$packageName" =~ [^a-zA-Z0-9-] ]]; then
	echo "Usage: npm run init -- PACKAGE_NAME"
	exit 1
fi

packageDir="./elements/$packageName"
# Just in case package folder doesn't exist yet.
mkdir -p "$packageDir"
mkdir -p "$packageDir/src"
mkdir -p "$packageDir/test"

cp "./templates/package.json.tmpl" "$packageDir/package.json"
sed -i '' -e "s/{PACKAGE}/${packageName}/g" "$packageDir/package.json"
sed -i '' -e "s/{PORT}/${port}/g" "$packageDir/package.json"
sed -i '' -e "s/{BROWSER_PACKAGE}/${browserPackageName}/g" "$packageDir/package.json"
cp "./templates/README.md.tmpl" "$packageDir/README.md"

templates=(
	"browsertest"
	"cypress"
	"scripts"
	".npmignore"
	".npmrc"
	".nycrc"
	".prettierignore"
	".prettierrc.json"
	"cypress.json"
	"tslint.json"
	"jest.config.js"
	"tsconfig.json"
	"tsconfig.browsertest.json"
)

test_templates=(
	"tslint.json"
	"tsconfig.json"
)

for i in "${templates[@]}"
do
	echo ${i}
	if [ ! -e "$packageDir/${i}" ];	then
		ln -vs "../../templates/$i.tmpl" "$packageDir/$i"
	fi
done

for i in "${test_templates[@]}"
do
	echo ${i}
	if [ ! -e "$packageDir/test/${i}" ];	then
		ln -vs "../../../templates/test/$i.tmpl" "$packageDir/test/$i"
	fi
done