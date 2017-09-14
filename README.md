# <a href="http://liskhq.github.io/lisk-js/">Lisk-JS</a>

Lisk JS is a JavaScript library for [Lisk - the cryptocurrency and blockchain application platform](https://github.com/LiskHQ/lisk). It allows developers to create offline transactions and broadcast them onto the network. It also allows developers to interact with the core Lisk API, for retrieval of collections and single records of data located on the Lisk blockchain. Its main benefit is that it does not require a locally installed Lisk node, and instead utilizes the existing peers on the network. It can be used from the client as a [browserify](http://browserify.org/) compiled module, or on the server as a standard Node.js module.

[![Build Status](https://travis-ci.org/LiskHQ/lisk-js.svg?branch=development)](https://travis-ci.org/LiskHQ/lisk-js)
[![Coverage Status](https://coveralls.io/repos/github/LiskHQ/lisk-js/badge.svg?branch=master)](https://coveralls.io/github/LiskHQ/lisk-js?branch=master)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)
[![GitHub release](https://img.shields.io/badge/version-0.5.0-blue.svg)](#)

## Browser

```html
<script src="./lisk-js.js"></script>
<script>
	lisk.api().searchDelegateByUsername('oliver', function (response) {
		console.log(response);
	});
</script>
```

## CDN

https://gitcdn.xyz/repo/LiskHQ/lisk-js/development/dist/lisk-js.js<br/>
```html
<script src="https://gitcdn.xyz/repo/LiskHQ/lisk-js/development/dist/lisk-js.js"></script>
```

## Server

## Install
```
$ npm install lisk-js --save
```

To learn more about the API or to experiment with some data, please go to the github page:

http://liskhq.github.io/lisk-js/

## Tests

```
npm test
```

Tests written using mocha + schedule.js.

## Documentation

- [Install](http://liskhq.github.io/lisk-js/index.html)
- [API](http://liskhq.github.io/lisk-js/example/api.html)
	- [Settings](http://liskhq.github.io/lisk-js/example/api.html#settings)
	- [API Functions](http://liskhq.github.io/lisk-js/example/api.html#api_functions)
	- [Network Functions](http://liskhq.github.io/lisk-js/example/api.html#network_functions)
- [Crypto](http://liskhq.github.io/lisk-js/example/api.html#crypto)
- [Transactions](http://liskhq.github.io/lisk-js/example/api.html#transactions)
	- [Create Transaction](http://liskhq.github.io/lisk-js/example/api.html#functions_createTransaction)
	- [Create Vote](http://liskhq.github.io/lisk-js/example/api.html#functions_createVote)
	- [Create Dapp](http://liskhq.github.io/lisk-js/example/api.html#functions_createDapp)
	- [Create Delegate](http://liskhq.github.io/lisk-js/example/api.html#functions_createDelegate)
	- [Create Second Signature](http://liskhq.github.io/lisk-js/example/api.html#functions_createSignature)
	- [Create Multisignature Account](http://liskhq.github.io/lisk-js/example/api.html#functions_createMultisignature)
	- [Sign Multisignature Transaction](http://liskhq.github.io/lisk-js/example/api.html#functions_signMultisignature)
- [Experiment (live)](http://liskhq.github.io/lisk-js/example/experiment.html)
	- [Get Account Info](http://liskhq.github.io/lisk-js/example/experiment.html#get_account)
	- [Send LSK](http://liskhq.github.io/lisk-js/example/experiment.html#send_lsk)
	- [Sign Message](http://liskhq.github.io/lisk-js/example/experiment.html#sign)
	- [Verify Message](http://liskhq.github.io/lisk-js/example/experiment.html#verify)
	- [Encrypt Message](http://liskhq.github.io/lisk-js/example/experiment.html#encrypt)
	- [Decrypt Message](http://liskhq.github.io/lisk-js/example/experiment.html#decrypt)

## Authors

- Boris Povod <boris@crypti.me>
- Oliver Beddows <oliver@lightcurve.io>
- Tobias Schwarz <tobias@lightcurve.io>

## License

Copyright © 2016-2017 Lisk Foundation

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the [GNU General Public License](https://github.com/LiskHQ/lisk-js/tree/master/LICENSE) along with this program.  If not, see <http://www.gnu.org/licenses/>.

***

This program also incorporates work previously released with lisk-js `0.2.3` (and earlier) versions under the [MIT License](https://opensource.org/licenses/MIT). To comply with the requirements of that license, the following permission notice, applicable to those parts of the code only, is included below:

Copyright © 2016-2017 Lisk Foundation  
Copyright © 2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
