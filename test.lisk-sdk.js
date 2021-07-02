Testing your local lisk-sdk in your application.
In order to link your local lisk-sdk repository and test your application which uses lisk-sdk, simply follow the steps below in your local lisk-sdk repository and run yarn link lisk-sdk in the root of your application.

cd sdk

yarn link

Once you have linked your local repo, everytime you make changes in lisk-sdk/elements you must build packages before testing:

a. To build all packages: npm run build or yarn build

b. To build specific package: yarn workspace <package name> build or go into each package folder and yarn build or npm run build Example: yarn workspace @liskhq/lisk-p2p build

Note: In case you face any issues during the installation make sure you have the right version of yarn and node and try to install from scratch by running, yarn clean:node_modules && rm -rf ./node_modules.
