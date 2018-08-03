# Lisk Elements

Lisk Elements is a JavaScript library for [Lisk][Lisk Core GitHub], the blockchain application platform.

[![Build Status](https://jenkins.lisk.io/buildStatus/icon?job=lisk-elements/development)](https://jenkins.lisk.io/job/lisk-elements/job/development/)
<a href="https://david-dm.org/LiskHQ/lisk-elements"><img src="https://david-dm.org/LiskHQ/lisk-elements.svg" alt="Dependency Status"></a>
<a href="https://david-dm.org/LiskHQ/lisk-elements/?type=dev"><img src="https://david-dm.org/LiskHQ/lisk-elements/dev-status.svg" alt="devDependency Status"></a>
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)

## Installation

### Installation via npm

Add Lisk Elements as a dependency of your project:

```sh
$ npm install --save lisk-elements
```

Import using ES6 modules syntax:

```js
import lisk from 'lisk-elements';
```

Or using Node.js modules:

```js
const lisk = require('lisk-elements');
```

Or import specific namespaced functionality:

```js
import { APIClient, transactions } from 'lisk-elements';
// or
const { APIClient, transactions } = require('lisk-elements');
```

**Note:** If you are installing Lisk Elements as an npm dependency via a GitHub reference, you will need to manually build the distribution files by running the following commands from the root directory of your project:

```
cd node_modules/lisk-elements
npm run build
```

### Installation via CDN

Include the following script using the following HTML. The `lisk` variable will be exposed.

```html
<script src="https://js.lisk.io/lisk-elements-1.0.0.js"></script>
```

Or minified:

```html
<script src="https://js.lisk.io/lisk-elements-1.0.0.min.js"></script>
```

### Installation from source

Our source code is hosted on GitHub. You can build the distribution yourself by cloning the repository, installing the relevant dependencies and running our build script as follows:

```
git clone https://github.com/LiskHQ/lisk-elements.git
cd lisk-elements
npm install
npm run build
```

## Usage

Access functionality via the relevant namespace. For example, the following will create and (locally) sign a transfer (type 0) transaction, and then broadcast it to the Lisk Testnet.

```js
const transaction = lisk.transaction.transfer({
	amount: '123000000',
	recipientId: '12668885769632475474L',
	passphrase: 'robust swift grocery peasant forget share enable convince deputy road keep cheap',
});

const client = lisk.APIClient.createTestnetAPIClient();

client.transactions.broadcast(transaction)
	.then(console.info)
	.catch(console.error);
```

Full documentation can be found on the [Lisk documentation site][].

## Contributors

https://github.com/LiskHQ/lisk-elements/graphs/contributors

## License

Copyright © 2016-2018 Lisk Foundation

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the [GNU General Public License](https://github.com/LiskHQ/lisk-elements/tree/master/LICENSE) along with this program.  If not, see <http://www.gnu.org/licenses/>.

***

This program also incorporates work previously released with lisk-js `v0.5.2` (and earlier) versions under the [MIT License](https://opensource.org/licenses/MIT). To comply with the requirements of that license, the following permission notice, applicable to those parts of the code only, is included below:

Copyright © 2016-2017 Lisk Foundation

Copyright © 2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


[Lisk Core GitHub]: https://github.com/LiskHQ/lisk
[Lisk documentation site]: https://lisk.io/documentation/lisk-elements
