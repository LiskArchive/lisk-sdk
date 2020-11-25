# Lisk Elements

Lisk Elements is a JavaScript library for building blockchain applications in the Lisk network

## Installation

### Installation via npm

Add Lisk Elements as a dependency of your project:

```sh
$ npm install --save lisk-elements
```

Import using ES6 modules syntax:

```js
import * as lisk from 'lisk-elements';
```

Or using Node.js modules:

```js
const lisk = require('lisk-elements');
```

Or import specific namespaced functionality:

```js
import { transactions } from 'lisk-elements';
// or
const { transactions } = require('lisk-elements');
```

## Packages

| Package                                                   |                              Version                               | Description                                                                                              |
| --------------------------------------------------------- | :----------------------------------------------------------------: | -------------------------------------------------------------------------------------------------------- |
| [lisk-elements](./)                                       |         ![npm](https://img.shields.io/npm/v/lisk-elements)         | Package contains everything                                                                              |
| [@liskhq/lisk-api-client](../lisk-api-client)             |    ![npm](https://img.shields.io/npm/v/@liskhq/lisk-api-client)    | An API client for the Lisk network                                                                       |
| [@liskhq/lisk-bft](../lisk-bft)                           |       ![npm](https://img.shields.io/npm/v/@liskhq/lisk-bft)        | Byzantine fault tolerance implementation according to the Lisk protocol                                  |
| [@liskhq/lisk-chain](../lisk-chain)                       |      ![npm](https://img.shields.io/npm/v/@liskhq/lisk-chain)       | Implements blocks and state management that are used for block processing according to the Lisk protocol |
| [@liskhq/lisk-codec](../lisk-codec)                       |      ![npm](https://img.shields.io/npm/v/@liskhq/lisk-codec)       | Decoder and encoder using Lisk JSON schema according to the Lisk protocol                                |
| [@liskhq/lisk-cryptography](../lisk-cryptography)         |   ![npm](https://img.shields.io/npm/v/@liskhq/lisk-cryptography)   | General cryptographic functions for use with Lisk-related software                                       |
| [@liskhq/lisk-db](../lisk-db)                             |        ![npm](https://img.shields.io/npm/v/@liskhq/lisk-db)        | A database access implementation for use with Lisk-related software                                      |
| [@liskhq/lisk-genesis](../lisk-genesis)                   |     ![npm](https://img.shields.io/npm/v/@liskhq/lisk-genesis)      | Genesis block creation functions according to the Lisk protocol                                          |
| [@liskhq/lisk-p2p](../lisk-p2p)                           |       ![npm](https://img.shields.io/npm/v/@liskhq/lisk-p2p)        | _unstructured_ P2P library for the Lisk protocol                                                         |
| [@liskhq/lisk-passphrase](../lisk-passphrase)             |    ![npm](https://img.shields.io/npm/v/@liskhq/lisk-passphrase)    | Mnemonic passphrase helpers for use with Lisk-related software                                           |
| [@liskhq/lisk-transactions](../lisk-transactions)         |   ![npm](https://img.shields.io/npm/v/@liskhq/lisk-transactions)   | Everything related to transactions according to the Lisk protocol                                        |
| [@liskhq/lisk-transaction-pool](../lisk-transaction-pool) | ![npm](https://img.shields.io/npm/v/@liskhq/lisk-transaction-pool) | Transaction pool implementation for the Lisk network                                                     |
| [@liskhq/lisk-tree](../lisk-tree)                         |       ![npm](https://img.shields.io/npm/v/@liskhq/lisk-tree)       | Markle tree implementations for use with Lisk-related software                                           |
| [@liskhq/lisk-utils](../lisk-utils)                       |      ![npm](https://img.shields.io/npm/v/@liskhq/lisk-utils)       | Generic utility functions for use with Lisk-related software                                             |
| [@liskhq/lisk-validator](../lisk-validator)               |    ![npm](https://img.shields.io/npm/v/@liskhq/lisk-validator)     | Validation library according to the Lisk protocol                                                        |

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

[lisk core github]: https://github.com/LiskHQ/lisk
[lisk documentation site]: https://lisk.io/documentation/lisk-elements
