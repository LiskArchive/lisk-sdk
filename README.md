# <a href="http://liskhq.github.io/lisk-elements/">Lisk Elements</a>

Lisk Elements is a JavaScript library for [Lisk - the cryptocurrency and blockchain application platform](https://github.com/LiskHQ/lisk). It allows developers to create offline transactions and broadcast them onto the network. It also allows developers to interact with the core Lisk API, for retrieval of collections and single records of data located on the Lisk blockchain. Its main benefit is that it does not require a locally installed Lisk node, and instead utilizes the existing nodes on the network. It can be used from the client as a [browserify](http://browserify.org/) compiled module, or on the server as a standard Node.js module.

[![Build Status](https://jenkins.lisk.io/buildStatus/icon?job=lisk-elements/development)](https://jenkins.lisk.io/job/lisk-elements/job/development/)
[![Coverage Status](https://coveralls.io/repos/github/LiskHQ/lisk-elements/badge.svg?branch=development)](https://coveralls.io/github/LiskHQ/lisk-elements?branch=development)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)
[![GitHub release](https://img.shields.io/badge/version-0.4.5-blue.svg)](#)

## Browser

```html
<script src="./lisk-elements.js"></script>
<script>
	lisk.api().searchDelegateByUsername('oliver', function (response) {
		console.log(response);
	});
</script>
```

## CDN

https://gitcdn.xyz/repo/LiskHQ/lisk-elements/browser/lisk-elements.js<br/>
```html
<script src="https://gitcdn.xyz/repo/LiskHQ/lisk-elements/browser/lisk-elements.js"></script>
```
Or minified:
https://gitcdn.xyz/repo/LiskHQ/lisk-elements/browser/lisk-elements.min.js<br/>
```html
<script src="https://gitcdn.xyz/repo/LiskHQ/lisk-elements/browser/lisk-elements.min.js"></script>
```

## Server

## Install
```
$ npm install lisk-elements --save
```

To learn more about the API or to experiment with some data, please go to the github page:

http://liskhq.github.io/lisk-elements/

## Tests

```
npm test
```

Tests written using mocha + schedule.js.

## Documentation

- [Install](https://docs.lisk.io/docs/lisk-elements-installation)
- [API](https://docs.lisk.io/docs/api-functions)
	- [Settings](https://docs.lisk.io/docs/api)
	- [API Functions](https://docs.lisk.io/docs/api-functions)
	- [Network Functions](https://docs.lisk.io/docs/network-functions)
- [Crypto](https://docs.lisk.io/docs/crypto-functions)
- [Transactions](https://docs.lisk.io/docs/transactions-1)
	- [Create Transaction](https://docs.lisk.io/docs/transactions-1#section-createtransaction)
	- [Create Vote](https://docs.lisk.io/docs/transactions-1#section-createvote)
	- [Create Dapp](https://docs.lisk.io/docs/transactions-1#section-createdapp)
	- [Create Delegate](https://docs.lisk.io/docs/transactions-1#section-createdelegate)
	- [Create Second Signature](https://docs.lisk.io/docs/transactions-1#section-createtransaction)
	- [Create Multisignature Account](https://docs.lisk.io/docs/transactions-1#section-createmultisignature)
	- [Sign Multisignature Transaction](https://docs.lisk.io/docs/transactions-1#section-signtransaction)

## Contributors

https://github.com/LiskHQ/lisk-elements/graphs/contributors

## License

Copyright © 2016-2018 Lisk Foundation

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the [GNU General Public License](https://github.com/LiskHQ/lisk-elements/tree/master/LICENSE) along with this program.  If not, see <http://www.gnu.org/licenses/>.

***

This program also incorporates work previously released with lisk-js `v0.5.1` (and earlier) versions under the [MIT License](https://opensource.org/licenses/MIT). To comply with the requirements of that license, the following permission notice, applicable to those parts of the code only, is included below:

Copyright © 2016-2017 Lisk Foundation
Copyright © 2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
