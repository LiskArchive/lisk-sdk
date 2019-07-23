# @liskhq/lisk-client

A default set of Elements for use by clients of the Lisk network

## Installation

### Installation via npm

Add Lisk Client as a dependency of your project:

```sh
$ npm install --save @liskhq/lisk-client
```

Import using ES6 modules syntax:

```js
import lisk from '@liskhq/lisk-client';
```

Or using Node.js modules:

```js
const lisk = require('@liskhq/lisk-client');
```

Or import specific namespaced functionality:

```js
import { APIClient, transactions } from '@liskhq/lisk-client';
// or
const { APIClient, transactions } = require('@liskhq/lisk-client');
```

### Installation via CDN

Include the following script using the following HTML. The `lisk` variable will be exposed.

```html
<script src="https://js.lisk.io/lisk-client-1.1.0.js"></script>
```

Or minified:

```html
<script src="https://js.lisk.io/lisk-client-1.1.0.min.js"></script>
```

## Packages

| Package                                                  |                                                      Version                                                      | Description                                                        |
| -------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------: | ------------------------------------------------------------------ |
| [@liskhq/lisk-api-client](../lisk-api-client)            |  [![](https://img.shields.io/badge/npm-v2.0.1-green.svg)](https://www.npmjs.com/package/@liskhq/lisk-api-client)  | An API client for the Lisk network                                 |
| [@liskhq/lisk-constants](../lisk-constants)              |  [![](https://img.shields.io/badge/npm-v1.2.1-green.svg)](https://www.npmjs.com/package/@liskhq/lisk-constants)   | General constants for use with Lisk-related software               |
| [@liskhq/lisk-cryptography](../lisk-cryptography)        | [![](https://img.shields.io/badge/npm-v2.1.0-green.svg)](https://www.npmjs.com/package/@liskhq/lisk-cryptography) | General cryptographic functions for use with Lisk-related software |
| [@liskhq/lisk-passphrase](../lisk-passphrase)            |  [![](https://img.shields.io/badge/npm-v2.0.1-green.svg)](https://www.npmjs.com/package/@liskhq/lisk-passphrase)  | Mnemonic passphrase helpers for use with Lisk-related software     |
| [@liskhq/lisk-transactions](/packages/lisk-transactions) | [![](https://img.shields.io/badge/npm-v2.1.1-green.svg)](https://www.npmjs.com/package/@liskhq/lisk-transactions) | Everything related to transactions according to the Lisk protocol  |

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

[lisk core github]: https://github.com/LiskHQ/lisk
[lisk documentation site]: https://lisk.io/documentation/lisk-elements
