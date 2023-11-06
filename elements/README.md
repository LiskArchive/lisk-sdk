![Logo](../docs/assets/banner_elements.png)

# Lisk Elements

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](http://www.apache.org/licenses/LICENSE-2.0)

## What is Lisk Elements

Lisk Elements is a collection of libraries, each of them implementing some form of blockchain application functionality such as cryptography, transactions, p2p, etc. Each library is designed to be compatible with the [Lisk Protocol](https://lisk.com/documentation/lisk-sdk/protocol).

Lisk Elements supports the modular architecture of the Lisk SDK, where libraries can be created or modified to suit individual blockchain application requirements.

## Packages

| Package                                                  |                              Version                               | Description                                                                                              |
| -------------------------------------------------------- | :----------------------------------------------------------------: | -------------------------------------------------------------------------------------------------------- |
| [lisk-elements](./lisk-elements)                         |         ![npm](https://img.shields.io/npm/v/lisk-elements)         | Package contains everything                                                                              |
| [@liskhq/lisk-api-client](./lisk-api-client)             |    ![npm](https://img.shields.io/npm/v/@liskhq/lisk-api-client)    | An API client for the Lisk network                                                                       |
| [@liskhq/lisk-chain](./lisk-chain)                       |      ![npm](https://img.shields.io/npm/v/@liskhq/lisk-chain)       | Implements blocks and state management that are used for block processing according to the Lisk protocol |
| [@liskhq/lisk-codec](./lisk-codec)                       |      ![npm](https://img.shields.io/npm/v/@liskhq/lisk-codec)       | Decoder and encoder using Lisk JSON schema according to the Lisk protocol                                |
| [@liskhq/lisk-cryptography](./lisk-cryptography)         |   ![npm](https://img.shields.io/npm/v/@liskhq/lisk-cryptography)   | General cryptographic functions for use with Lisk-related software                                       |
| [@liskhq/lisk-db](./lisk-db)                             |        ![npm](https://img.shields.io/npm/v/@liskhq/lisk-db)        | A database access implementation for use with Lisk-related software                                      |
| [@liskhq/lisk-p2p](./lisk-p2p)                           |       ![npm](https://img.shields.io/npm/v/@liskhq/lisk-p2p)        | _unstructured_ P2P library for the Lisk protocol                                                         |
| [@liskhq/lisk-passphrase](./lisk-passphrase)             |    ![npm](https://img.shields.io/npm/v/@liskhq/lisk-passphrase)    | Mnemonic passphrase helpers for use with Lisk-related software                                           |
| [@liskhq/lisk-transactions](./lisk-transactions)         |   ![npm](https://img.shields.io/npm/v/@liskhq/lisk-transactions)   | Everything related to transactions according to the Lisk protocol                                        |
| [@liskhq/lisk-transaction-pool](./lisk-transaction-pool) | ![npm](https://img.shields.io/npm/v/@liskhq/lisk-transaction-pool) | Transaction pool implementation for the Lisk network                                                     |
| [@liskhq/lisk-tree](./lisk-tree)                         |       ![npm](https://img.shields.io/npm/v/@liskhq/lisk-tree)       | Merkle tree implementations for use with Lisk-related software                                           |
| [@liskhq/lisk-utils](./lisk-utils)                       |      ![npm](https://img.shields.io/npm/v/@liskhq/lisk-utils)       | Generic utility functions for use with Lisk-related software                                             |
| [@liskhq/lisk-validator](./lisk-validator)               |    ![npm](https://img.shields.io/npm/v/@liskhq/lisk-validator)     | Validation library according to the Lisk protocol                                                        |

## Installation

If you want to install all elements as dependency of your project you can install it via.

```sh
$ npm install --save lisk-elements
```

Or you can install individual packages what you need e.g.

```sh
$ npm install --save @liskhq/lisk-transactions
$ npm install --save @liskhq/lisk-cryptography
```

## Get Involved

| Reason                          | How                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Want to chat with our community | [Reach them on Discord](https://discord.gg/lisk)                                                |
| Found a bug                     | [Open a new issue](https://github.com/LiskHQ/lisk-sdk/issues/new)                               |
| Found a security issue          | [See our bounty program](https://blog.lisk.com/announcing-lisk-bug-bounty-program-5895bdd46ed4) |
| Want to share your research     | [Propose your research](https://research.lisk.com)                                              |
| Want to develop with us         | [Create a fork](https://github.com/LiskHQ/lisk-sdk/fork)                                        |

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
