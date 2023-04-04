![Logo](./docs/assets/banner_sdk.png)

# Lisk SDK

[![Build status](https://github.com/LiskHQ/lisk-sdk/actions/workflows/branch.yaml/badge.svg?branch=development)](https://github.com/LiskHQ/lisk-sdk/actions/workflows/branch.yaml)
![npm](https://img.shields.io/npm/v/lisk-sdk)
![GitHub tag (latest by date)](https://img.shields.io/github/v/tag/liskHQ/lisk-sdk)
![GitHub repo size](https://img.shields.io/github/repo-size/liskhq/lisk-sdk)
[![DeepScan grade](https://deepscan.io/api/teams/6759/projects/8869/branches/113509/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=6759&pid=8869&bid=113509)
![GitHub issues](https://img.shields.io/github/issues-raw/liskhq/lisk-sdk)
![GitHub closed issues](https://img.shields.io/github/issues-closed-raw/liskhq/lisk-sdk)
[![codecov](https://codecov.io/gh/LiskHQ/lisk-sdk/branch/development/graph/badge.svg?token=2JhT7caf5x)](https://codecov.io/gh/LiskHQ/lisk-sdk)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](http://www.apache.org/licenses/LICENSE-2.0)

## Sapphire phase nearly completed

With the release of Lisk SDK v6.0.0, we are completing the [Sapphire phase](https://lisk.com/roadmap), which brings the [Lisk interoperability solution](https://lisk.com/blog/research/lisk-interoperability-solution-published).

To learn more about the Lisk protocol and its' current development status, check out [Lisk Roadmap](https://lisk.com/roadmap), [Lisk Improvement Proposal](https://github.com/LiskHQ/lips), and [Research Forum](https://research.lisk.com/).

We hope you enjoy building your proof-of-concept Web3 applications using the Lisk SDK, and look forward to receive your feedback and contributions during the beta phase.

## What is the Lisk SDK?

The Lisk SDK aims to provide an easy and reliable software development kit for building blockchain applications which are compatible with the Lisk protocol.

The [architecture](#architecture-overview) of the Lisk SDK has been designed so that it can be extended to meet the requirements of a wide variety of blockchain application use cases.

The codebase is written entirely in JavaScript/TypeScript, which means for a majority of developers, no significant change of tools or mindset is required to get started.

The Lisk SDK makes every effort to allow developers to focus simply and purely on writing the code that matters to their own blockchain application, and nothing more.

## Usage

Lisk SDK is all-in-one package that provides you with tools to create, run and maintain blockchain applications in JavaScript/TypeScript.

### Dependencies

The following dependencies need to be installed in order to run blockchain clients created with the Lisk SDK.

#### Node.js

If you are using NVM, install the correct version as shown below:

```sh
nvm install v16.18.0
```

#### Lisk Commander

It is recommended to install Lisk Commander globally with NPM (Node Package Manager), to facilitate the convenient usage of the Lisk Commander CLI.

```sh
npm install --global lisk-commander@beta
```

To check the successful installation of Lisk Commander, run the following command:

```sh
$ lisk --version
lisk-commander/6.0.0 darwin-arm64 node-v16.18.0
```

#### Toolchain dependencies

Once Lisk Commander is installed, install the following compiler dependencies as well.

##### Ubuntu

```sh
sudo apt update
sudo apt install -y libtool automake autoconf curl build-essential python2-minimal
```

##### macOS

Ensure that [Homebrew](https://brew.sh/) is installed.

```sh
brew install autoconf automake libtool python2
```

### Initializing a new blockchain client

Execute the `lisk init` command of Lisk Commander as shown below, to bootstrap a default blockchain client in the current folder.

```sh
lisk init
```

As a result of executing the `init` command, you will be asked for the _Name_, _ChainID_, _Description_, _Author_, and _License_ of the new blockchain client.

```
Using template "lisk-ts"
Initializing git repository
Updating .liskrc.json file
Creating project structure
? Application name my_client
? Chain ID in hex representation. ChainID must be 4 bytes (8 characters) 12345678
? Application description A simple blockchain client for my Web3 application
? Author XYZ
? License ISC
```

Next, all the required files are created by Lisk Commander.

It is now already possible to start the newly bootstrapped blockchain client with default configurations for a local Devnet:

```sh
./bin/run start
```

### Configure your blockchain parameters

The blockchain client offers a variety of configuration options such as `blockTime`, `maxTransactionsSize` and more.

For a complete overview of the client configuration options, please check out the [SDK configuration reference](https://lisk.com/documentation/lisk-sdk/v6/config.html) and the [Blockchain client configuration](https://lisk.com/documentation/beta/build-blockchain/configuration.html) guide.

To use the custom config with the client, use the `--config` flag.
Also add the `--overwrite-config` flag, if you used another config the last time the client was started.

```sh
./bin/run start --config config/custom_config.json --overwrite-config
```

### Register a custom module or a custom plugin

A custom [module](https://lisk.com/documentation/beta/understand-blockchain/sdk/modules-commands.html) is a logic to define state changes that will be executed on-chain meaning that it will be a part of the blockchain protocol.

A custom [plugin](https://lisk.com/documentation/beta/understand-blockchain/sdk/plugins.html), on the other hand, is a logic to define an off-chain logic which is not part of the blockchain protocol but to enhance the blockchain application features.

Add your custom module and custom plugin to your blockchain client conveniently with Lisk Commander:

#### Generating a new module

Use the `generate:module` command in the root folder of the blockchain client to generate a ready-to-use module template.

```sh
lisk generate:module my-module-name
```

For more detailed explanations how to create a module, please refer to the guide [How to create a module](https://lisk.com/documentation/beta/build-blockchain/module/index.html)

#### Generating a new plugin

Use the `generate:plugin` command in the root folder of the blockchain client to generate a ready-to-use plugin template.

```sh
lisk generate:plugin my-plugin-name
```

For more detailed explanations how to create a module, please refer to the guide [How to create a plugin](https://lisk.com/documentation/beta/build-blockchain/plugin/index.html)

### Documentation

For further explanations, guides and tutorials, see the [official Lisk SDK documentation](https://lisk.com/documentation/lisk-sdk/v6).

## Architecture Overview

The Lisk SDK operates on the NodeJS runtime and consists primarily of an application framework (Lisk Framework), a collection of libraries providing blockchain application functionalities (Lisk Elements), and a powerful command-line tool (Lisk Commander) helping developers to build a blockchain application using Lisk Framework.
The diagram below provides a high-level overview of the architecture:

![Diagram](./docs/assets/diagram_sdk.png)

### Packages

| Directory                | Description                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Framework](./framework) | An application framework responsible for establishing and maintaining the interactions between the modules of a Lisk blockchain application.         |
| [Elements](./elements)   | A collection of libraries, each of them implementing some form of blockchain application functionality such as cryptography, transactions, p2p, etc. |
| [Commander](./commander) | A command line tool to help developers to build a blockchain application using Lisk Framework.                                                       |

## Get Involved

| Reason                          | How                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Want to chat with our community | [Reach them on Discord](https://discord.gg/lisk)                                                |
| Found a bug                     | [Open a new issue](https://github.com/LiskHQ/lisk/issues/new)                                   |
| Found a security issue          | [See our bounty program](https://blog.lisk.com/announcing-lisk-bug-bounty-program-5895bdd46ed4) |
| Want to share your research     | [Propose your research](https://research.lisk.com)                                              |
| Want to develop with us         | [Create a fork](https://github.com/LiskHQ/lisk/fork)                                            |

## How to Contribute

To contribute to `lisk-sdk`, `framework` or `elements`:

1. Clone the repository: `git clone https://github.com/LiskHQ/lisk-sdk.git`

2. Install [Yarn Classic](https://classic.yarnpkg.com/en/docs/install) globally

3. Install dependencies and build:
   1. `yarn`
   2. `yarn build`

### Testing your local `lisk-sdk` in your application.

In order to link your local lisk-sdk repository and test your application which uses `lisk-sdk`, simply follow the steps below in your local `lisk-sdk` repository and run `yarn link lisk-sdk` in the root of your application.

1. `cd sdk`

2. `yarn link`

3. Once you have linked your local repo, every time you make changes in `lisk-sdk/elements` you must build packages before testing:

   a. To build all packages: `npm run build` or `yarn build`

   b. To build specific package: `yarn workspace <package name> build` or go into each package folder and `yarn build` or `npm run build`
   Example: `yarn workspace @liskhq/lisk-p2p build`

**Note:** In case you face any issues during the installation, make sure you have the right version of `yarn` and `node` and try resetting the project with `yarn clean:full`.

## Contributors

https://github.com/LiskHQ/lisk-sdk/graphs/contributors

## Disclaimer

By using the Beta release of the Lisk SDK, you acknowledge and agree that you have an adequate understanding of the risks associated with the use of the Beta release of the Lisk SDK and that it is provided on an “as is” and “as available” basis, without any representations or warranties of any kind.
To the fullest extent permitted by law, in no event shall the Lisk Foundation or other parties involved in the development of the Beta release of the Lisk SDK have any liability whatsoever to any person for any direct or indirect loss, liability, cost, claim, expense or damage of any kind, whether in contract or in tort, including negligence, or otherwise, arising out of or related to the use of all or part of the Beta release of the Lisk SDK.

## License

Copyright 2016-2023 Lisk Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
