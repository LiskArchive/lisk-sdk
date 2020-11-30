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

## Beta phase

Please read this carefully. With this repository we have opened access to the beta release of the Lisk SDK. We have released the Lisk SDK in its current form in order for us to improve the development experience through community feedback and contributions.

We strictly discourage anyone from using the beta release of the Lisk SDK for any production-based blockchain applications, i.e. a blockchain operating on a real mainnet. Throughout the beta phase, there will be significant changes in the Lisk protocol and implementation, which will eventually bring accessibility and reliability to a level that is feasible for production-based blockchain applications. At this time we only recommend the Lisk SDK for proof-of-concept blockchain applications, i.e. a blockchain operating on a fake testnet.

The only application built using the Lisk SDK currently feasible for production usage is [Lisk Core](https://github.com/liskhq/lisk-core), the client of the Lisk network itself.

Please be advised, although we have stabilised the architecture of SDK, we cannot guarantee blockchains created with the beta release of the Lisk SDK will remain compatible with our planned release candidates.

We hope you enjoy building your proof-of-concept blockchain applications using the Lisk SDK, and shall look forward to receiving your feedback and contributions during the beta phase.

## What is the Lisk SDK?

The Lisk SDK aims to provide an easy and reliable software development kit for building blockchain applications which are compatible with the [Lisk Protocol](https://lisk.io/documentation/lisk-protocol). The architecture of the Lisk SDK has been designed so that it can be extended to meet the requirements of a wide variety of blockchain application use-cases. The codebase is written entirely in JavaScript, which means for a majority of developers, no significant change of tools or mindset is required to get started. The Lisk SDK makes every effort to allow developers to focus simply and purely on writing the code that matters to their own blockchain application, and nothing more.

## Usage

### Documentation

For more detailed documentation, see the [official Lisk SDK documentation](https://lisk.io/documentation/lisk-sdk).

#### Dependencies

Before running Lisk SDK, the following dependencies need to be installed in order to run applications created with the Lisk SDK:

| Dependencies | Version |
| ------------ | ------- |
| NodeJS       | 12+     |

### Installation

The installation of Lisk Beta SDK is straightforward and limited to getting a single NPM package, `lisk-sdk`, to your Node.js project:

```
npm install lisk-sdk@beta
```

Lisk SDK is all-in-one package that provides you with tools to create, run and maintain blockchain applications in JavaScript.

### Set up new a blockchain application

To start, create the project structure of your blockchain application. There are no special requirements here, you can create the basic Node.js project folder structure with `npm init`.

To create a blockchain application, you need to provide an entry point of your application (like `index.js`) and set-up your network by using the modules of Lisk SDK.

It is quite simple to have a working blockchain application, mirroring the configuration of the existing Lisk network. This can be done by copying the following three lines of code to your `index.js`:

```js
const { Application, genesisBlockDevnet, configDevnet } = require('lisk-sdk');

const app = Application.defaultApplication(genesisBlockDevnet, configDevnet);

app
	.run()
	.then(() => app.logger.info('App started...'))
	.catch((error) => {
		console.error('Faced error in application', error);
		process.exit(1);
	});
```

After that you can start the application by:

```
node index.js
```

### Configure your blockchain parameters

You can also define your blockchain application parameters such as `blockTime`, `maxPayloadLength` and more with an optional configurations object.

```js
const app = Application.defaultApplication(genesisBlockDevnet, {
    genesisConfig: {
      communityIdentifier: 'newChain',
      blockTime: 5,
      maxPayloadLength: 100 * 1024,
      minRemainingBalance: "5000000",
	  activeDelegates: 101,
	  standbyDelegates: 2,
	  delegateListRoundOffset: 2
    },
    ...
});
```

### Register a custom module or a custom plugin

A custom module is a logic to define state changes that will be executed on-chain meaning that it will be a part of the blockchain protocol.
On the other hand, a custom plugin is a logic to define an off-chain logic which is not part of the blockchain protocol but to enhance the application features.

Add your custom module and custom plugin to your blockchain application by registering it to the application instance:

```js
const { Application, genesisBlockDevnet, configDevnet } = require('lisk-sdk');

const MyModule = require('./my_module');
const MyPlugin = require('./my_plugin');

const app = Application.defaultApplication(genesisBlockDevnet, configDevnet);

app.registerModule(MyModule); // register the custom module
app.registerPlugin(MyPlugin); // register the custom plugin

app
	.run()
	.then(() => app.logger.info('App started...'))
	.catch((error) => {
		console.error('Faced error in application', error);
		process.exit(1);
	});
```

## Architecture Overview

The Lisk SDK operates on the NodeJS runtime and consists primarily of an application framework (Lisk Framework), a collection of libraries providing blockchain application functionalities (Lisk Elements), and a powerful command-line tool (Lisk Commander) helping developers to build a blockchain application using Lisk Framework. The diagram below provides a high-level overview of the architecture:

![Diagram](./docs/assets/diagram_sdk.png)

### Packages

| Directory                | Description                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Framework](./framework) | An application framework responsible for establishing and maintaining the interactions between the modules of a Lisk blockchain application.         |
| [Elements](./elements)   | A collection of libraries, each of them implementing some form of blockchain application functionality such as cryptography, transactions, p2p, etc. |
| [Commander](./commander) | A command line tool to help developers to build a blockchain application using Lisk Framework.                                                       |

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

Copyright 2016-2020 Lisk Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
