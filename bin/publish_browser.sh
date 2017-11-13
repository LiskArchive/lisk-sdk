#!/bin/sh
BRANCHNAME_START=$(git rev-parse --abbrev-ref HEAD)
BRANCHNAME_TEMP=temp-browser-publish
DIRNAME_TEMP=dist-browser-temp
VERSION=$(node -p -e "require('./package.json').version")

{
	git checkout -b $BRANCHNAME_TEMP
	mkdir dist-browser-temp
	cp dist-browser/lisk-js.* $DIRNAME_TEMP && \
	cp dist-browser/README.md $DIRNAME_TEMP && \
	git add dist-browser-temp && \
	git commit -m "Publish browser version $VERSION" --no-verify && \
	git push origin $(git subtree split --prefix $DIRNAME_TEMP):browser --force-with-lease
} || {
	echo "Could not publish browser files. Cleaning up..."
}

git checkout $BRANCHNAME_START
git branch -D $BRANCHNAME_TEMP
