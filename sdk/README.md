![Logo](./docs/assets/banner_sdk.png)

# Lisk SDK

[![Build Status](https://jenkins.lisk.io/job/lisk-sdk/job/development/badge/icon)](https://jenkins.lisk.io/job/lisk-sdk/job/development/)
![npm](https://img.shields.io/npm/v/lisk-sdk)
![GitHub tag (latest by date)](https://img.shields.io/github/v/tag/liskHQ/lisk-sdk)
![GitHub repo size](https://img.shields.io/github/repo-size/liskhq/lisk-sdk)
[![DeepScan grade](https://deepscan.io/api/teams/6759/projects/8869/branches/113509/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=6759&pid=8869&bid=113509)
![GitHub issues](https://img.shields.io/github/issues-raw/liskhq/lisk-sdk)
![GitHub closed issues](https://img.shields.io/github/issues-closed-raw/liskhq/lisk-sdk)
![Jenkins Coverage](https://img.shields.io/jenkins/coverage/cobertura?jobUrl=https%3A%2F%2Fjenkins.lisk.io%2Fjob%2Flisk-sdk%2Fjob%2Fdevelopment)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](http://www.apache.org/licenses/LICENSE-2.0)

## Alpha phase

Please read this carefully. With this repository we have opened access to the alpha release of the Lisk SDK. We have released the Lisk SDK in its current form in order for us to improve the development experience through community feedback and contributions.

We strictly discourage anyone from using the alpha release of the Lisk SDK for any production-based blockchain applications, i.e. a blockchain operating on a real mainnet. Over the course of the alpha phase there will be significant changes in the Lisk protocol and implementation, which will eventually bring the accessibility and reliability to a level which is feasible for production-based blockchain applications. At this time we only recommend the Lisk SDK for proof-of-concept blockchain applications, i.e. a blockchain operating on a fake testnet.

The only application built using the Lisk SDK currently feasible for production usage is [Lisk Core](https://github.com/liskhq/lisk-core), the client of the Lisk network itself.

Please be advised we cannot guarantee blockchains created with the alpha release of the Lisk SDK will remain compatible with our planned (beta/rc) releases.

We hope you enjoy building your proof-of-concept blockchain applications using the Lisk SDK, and shall look forward to receiving your feedback and contributions during the alpha phase.

## What is the Lisk SDK?

The Lisk SDK aims to provide an easy and reliable software development kit for building blockchain applications which are compatible with the [Lisk Protocol](https://lisk.io/documentation/lisk-protocol). The architecture of the Lisk SDK has been designed so that it can be extended to meet the requirements of a wide variety of blockchain application use-cases. The codebase is written entirely in JavaScript, which means for a majority of developers, no significant change of tools or mindset is required to get started. The Lisk SDK makes every effort to allow developers to focus simply and purely on writing the code that matters to their own blockchain application, and nothing more.

## Usage

#### Dependencies

Before running Lisk SDK, the following dependencies need to be installed in order to run applications created with the Lisk SDK:

| Dependencies | Version |
| ------------ | ------- |
| NodeJS       | 12+     |

You can find further details on installing these dependencies in our [pre-installation setup guide](https://lisk.io/documentation/lisk-core/setup/source#pre-install).

### Installation

The installation of Lisk Alpha SDK is straightforward and limited to getting a single NPM package, `lisk-sdk`, to your Node.js project:

```
npm install lisk-sdk@alpha
```

Lisk SDK is all-in-one package that provides you with tools to create, run and maintain blockchain applications in JavaScript.

### Set up new a blockchain application

To start, create the project structure of your blockchain application. There are no special requirements here, you can create the basic Node.js project folder structure with `npm init`.

To create a blockchain application, you need to provide an entry point of your application (like `index.js`) and set-up your network by using the modules of Lisk SDK.

It is quite simple to have a working blockchain application, mirroring the configuration of the existing Lisk network. This can be done by copying the following three lines of code to your `index.js`:

```js
const { Application, genesisBlockDevnet, configDevnet } = require('lisk-sdk');

const app = new Application(genesisBlockDevnet, configDevnet);

app
	.run()
	.then(() => app.logger.info('App started...'))
	.catch(error => {
		console.error('Faced error in application', error);
		process.exit(1);
	});
```

After that you can start the application by:

```
node index.js
```

### Configure your blockchain parameters

You can also define your blockchain application parameters such as `BLOCK_TIME`, `MAX_TRANSACTIONS_PER_BLOCK` and more with an optional configurations object.

```js
const app = new Application(genesisBlockDevnet, {
    app: {
        label: 'my-blockchain-application',
        genesisConfig: {
            BLOCK_TIME: 10,
            MAX_TRANSACTIONS_PER_BLOCK: 25,
        },
        ...
});
```

For a complete list of configuration options see the [lisk-docs repo](https://github.com/LiskHQ/lisk-docs/blob/development/lisk-sdk/configuration.md).

### Register a custom transaction

You can [define your own transaction types](https://github.com/LiskHQ/lisk-docs/blob/master/lisk-sdk/customize.md) with Lisk-SDK. This is where the custom logic for your blockchain application lives.

Add your custom transaction type to your blockchain application by registering it to the application instance:

```js
const { Application, genesisBlockDevnet, configDevnet } = require('lisk-sdk');

const MyTransaction = require('./my_transaction');

const app = new Application(genesisBlockDevnet, configDevnet);

app.registerTransaction(MyTransaction); // register the custom transaction

app
	.run()
	.then(() => app.logger.info('App started...'))
	.catch(error => {
		console.error('Faced error in application', error);
		process.exit(1);
	});
```

For information on creating your own custom transaction, see the [lisk-docs repo](https://github.com/LiskHQ/lisk-docs/blob/master/lisk-sdk/customize.md) or [follow the tutorials](https://github.com/LiskHQ/lisk-docs/blob/development/start/tutorials/hello-world.md).

## Architecture Overview

The Lisk SDK operates on the NodeJS runtime and consists primarily of an application framework (Lisk Framework), a collection of libraries providing blockchain application functionalities (Lisk Elements), and a powerful command-line tool (Lisk Commander) allowing developers to manage a Lisk node instance and interact with a Lisk compatible network. The diagram below provides a high-level overview of the architecture:

![Diagram](./docs/assets/diagram_sdk.png)

### Packages

| Directory                | Description                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Framework](./framework) | An application framework responsible for establishing and maintaining the interactions between the modules of a Lisk blockchain application.         |
| [Elements](./elements)   | A collection of libraries, each of them implementing some form of blockchain application functionality such as cryptography, transactions, p2p, etc. |
| [Commander](./commander) | A command line tool allowing developers to manage a Lisk node instance and interact with a Lisk compatible network.                                  |

## Get Involved

| Reason                          | How                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Want to chat with our community | [Reach them on Discord](https://discord.gg/lisk)                                               |
| Found a bug                     | [Open a new issue](https://github.com/LiskHQ/lisk/issues/new)                                  |
| Found a security issue          | [See our bounty program](https://blog.lisk.io/announcing-lisk-bug-bounty-program-5895bdd46ed4) |
| Want to share your research     | [Propose your research](https://research.lisk.io)                                              |
| Want to develop with us         | [Create a fork](https://github.com/LiskHQ/lisk/fork)                                           |

## How to Contribute

To contribute to `lisk-sdk`, `framework` or `elements`:

1. Clone the repository: `git clone https://github.com/LiskHQ/lisk-sdk.git`

2. Install yarn globally: [Install Yarn](https://classic.yarnpkg.com/en/docs/install)

3. Install dependencies and build:
   1. `yarn`
   2. `yarn build`

### Testing your local `lisk-sdk` in your application.

In order to link your local lisk-sdk repository and test your application which uses `lisk-sdk`, simply follow the steps below in your local `lisk-sdk` repository and run `yarn link lisk-sdk` in the root of your application.

1. `cd sdk`

2. `yarn link`

3. Once you have linked your local repo, everytime you make changes in `lisk-sdk/elements` you must build packages before testing:

   a. To build all packages: `npm run build` or `yarn build`

   b. To build specific package: `yarn workspace <package name> build` or go into each package folder and `yarn build` or `npm run build`
   Example: `yarn workspace @liskhq/lisk-p2p build`

**Note:** In case you face any issues during the installation make sure you have the right version of `yarn` and `node` and try to install from scratch by running,
`yarn clean:node_modules && rm -rf ./node_modules`.

## Contributors

https://github.com/LiskHQ/lisk-sdk/graphs/contributors

## Disclaimer

By using the Alpha release of the Lisk SDK, you acknowledge and agree that you have an adequate understanding of the risks associated with the use of the Alpha release of the Lisk SDK and that it is provided on an “as is” and “as available” basis, without any representations or warranties of any kind. To the fullest extent permitted by law, in no event shall the Lisk Foundation or other parties involved in the development of the Alpha release of the Lisk SDK have any liability whatsoever to any person for any direct or indirect loss, liability, cost, claim, expense or damage of any kind, whether in contract or in tort, including negligence, or otherwise, arising out of or related to the use of all or part of the Alpha release of the Lisk SDK.

## License

Copyright 2016-2019 Lisk Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

---

Copyright © 2016-2019 Lisk Foundation

Copyright © 2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
