# lisk-js browser distribution

This branch contains the built lisk-js distribution files, ready for use in the browser. There is a
full build and a minified build (which is the one you want to use in most cases).

## Updating these files

New versions of these files will be automatically published via an NPM `postpublish` hook. This
script will:

1. Lint and test the codebase.
1. Build the distribution files (for Node and then for browser).
1. Checkout a temporary branch.
1. Create a directory containing the browser distribution files.
1. Commit those files with a relevant message to the temporary branch.
1. Force push (with lease) that subtree to the `browser` branch.
1. Checkout your original branch and delete the temporary branch.

The browser files can be independently published by running `npm run publish:browser` (but this
should not normally be needed).

Currently we have some redundancy in that the first two steps (linting/testing and building) are
already performed `prepublish`, but they are kept in place for now so that if the browser files are
updated independently the relevant checks are still performed. We can revisit this situation later,
but for now it has low priority as the checks are relatively quick and only happen once per release.

## Using the distributed files

Once published, these files can be accessed via CDN as described in the README at the root of the
project.
