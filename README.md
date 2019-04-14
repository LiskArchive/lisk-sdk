![Logo](./docs/assets/banner_sdk.png)

# Lisk SDK

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)
[![Join the chat at https://gitter.im/LiskHQ/lisk](https://badges.gitter.im/LiskHQ/lisk.svg)](https://gitter.im/LiskHQ/lisk?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## Disclaimer - Mostly Harmless

Please read our disclaimer carefully. We have just opened access to our alpha version of the Lisk SDK and hope to receive detailed feedback. Using our alpha release might still be tedious due to the evolving nature of our work-in-progress code.

We strictly encourage everyone to not use our alpha release for any production blockchain applications. There will be significant changes in the protocol and public interfaces in upcoming releases.

Have fun with our alpha release to build blockchain applications but don't expect to persist your data with future releases of our Lisk SDK. Blockchains created with this release may not be compatible anymore with future releases.

## What is Lisk SDK

Lisk SDK provides an easy, secure and scalable way to create blockchain applications in JavaScript. 

It facilitate developers to create their blockchain ledgers which follow [Lisk Protocol](https://lisk.io/documentation/lisk-protocol). 

All the tools, IDEs that you are experienced to built backend applications will still applies developing with Lisk SDK.

### Architecture Overview

Lisk SDK is consists of a framework, libraries and command line tools to facilitate all the aspects of developing a blockchain application. It hides the complexity of the technology and exposes an elegant, easy to use and accessible interfaces for developers. The conceptual stack for the Lisk SDK is shown below:

```
                                  Lisk SDK Ecosystem

                                +----------------------+
                                |                      |
                                |    Lisk Commander    |
                                |                      |
                                +----------------------+

                                +----------------------+
                                |                      |
                                |   Your Application   |
                                |                      |
                     |----------+----------------------+----------|
                     |                                            |
                     |               Lisk Framework               |
                     |                                            |
          -----------|----------|----------|-----------|----------|-----------
          |          |          |          |           |          |          |
          |          |          |    Lisk Elements     |          |          |
          |          |          |          |           |          |          |
     +----------------------------------------------------------------------------+
     |                                                                            |
     |                               NodeJS Runtime                               |
     |                                                                            |
     +----------------------------------------------------------------------------+
```

## Package Directories

| Directory                  | Description                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [Framework](./framework)   | Responsible for establishing the interactions between blockchain modules (using the Lisk Elemenents libraries) which together with the network configuration are exposed for SDK developers.  |
| [Elements](./elements)     | A collection of libraries, each of them is implementing a single domain of a blockchain element like transactions, cryptography etc. |
| [Commander](./commander)   | A command line tool which helps to manage a node as well as interacting with a network. |

## Installation

### Dependencies

Following dependencies need to be installed to run applications created with Lisk SDK:

| Dependencies     | Version |
| ---------------- | ------- |
| NodeJS           | 10.14.3 |
| PostgreSQL       | 10+     |
| Redis (optional) | 5+      |

You can find further details on installing these dependencies on our [documentation guide](https://lisk.io/documentation/lisk-core/setup/source#pre-install).

### Installation of Lisk SDK

To start with Lisk SDK you need to install one npm package - `lisk-framework`:

```
npm install lisk-framework
```

## Usage

Start from creating a project structure of your blockchain application. No special requirements here, you can create the basic Node.js project folder structure with `npm init`. 

Essentially to create a blockchain application, you need to provide an entry point of your application (like `index.js`) and set-up your network by using the modules of Lisk SDK. 

It's easy - to have a working blockchain application, mirroring the configuration of Lisk network,  it's enough to copy the following three lines of code to your `index.js`:


```js
const { Application, SampleGenesisBlock } = require('lisk-framework');

const app = new Application('my-app', SampleGenesisBlock);

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

The role model of big-scale application created using Lisk SDK is the client of Lisk network - [Lisk Core](https://github.com/liskhq/lisk-core).  

More details on the usage and other configurations along with more samples will become available on Lisk official [documentation portal](http://docs.lisk.io).

## Get Involved

|                           |                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Found a bug               | [Create new issue](https://github.com/LiskHQ/lisk/issues/new)                                                                    |
| Want to develop with us   | [Create a fork](https://github.com/LiskHQ/lisk/fork)                                                                             |
| Have ideas to share       | [Come to Lisk.chat](http://lisk.chat)                                                                                            |
| Want to involve community | [Join community gitter](https://gitter.im/LiskHQ/lisk?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) |
| Found a security issue    | [See our bounty program](https://blog.lisk.io/announcing-lisk-bug-bounty-program-5895bdd46ed4)                                   |
## Contributors

https://github.com/LiskHQ/lisk-sdk/graphs/contributors

## License

Copyright © 2016-2018 Lisk Foundation

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the [GNU General Public License](https://github.com/LiskHQ/lisk/tree/master/LICENSE) along with this program. If not, see <http://www.gnu.org/licenses/>.

---

This program also incorporates work previously released with lisk `0.9.11` (and earlier) versions under the [MIT License](https://opensource.org/licenses/MIT). To comply with the requirements of that license, the following permission notice, applicable to those parts of the code only, is included below:

Copyright © 2016-2018 Lisk Foundation
Copyright © 2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
