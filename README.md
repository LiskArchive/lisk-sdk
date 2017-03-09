# <a href="http://liskhq.github.io/lisk-js/">Lisk-JS</a>

Lisk JS is a JavaScript library for [Lisk - the cryptocurrency and blockchain application platform](https://github.com/LiskHQ/lisk). It allows developers to create offline transactions and broadcast them onto the network. It also allows developers to interact with the core Lisk API, for retrieval of collections and single records of data located on the Lisk blockchain. Its main benefit is that it does not require a locally installed Lisk node, and instead utilizes the existing peers on the network. It can be used from the client as a [browserify](http://browserify.org/) compiled module, or on the server as a standard Node.js module.

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0) [![Build Status](https://travis-ci.org/LiskHQ/lisk-js.svg?branch=development)](https://travis-ci.org/LiskHQ/lisk-js) [![Coverage Status](https://coveralls.io/repos/github/LiskHQ/lisk-js/badge.svg?branch=development)](https://coveralls.io/github/LiskHQ/lisk-js?branch=development) [![GitHub release](https://img.shields.io/badge/version-0.3-blue.svg)]()

## Browser

```html
<script src="./lisk-js.js"></script>
<script>
	lisk.api().searchDelegateByUsername('oliver', function (err, response) {
		console.log(err, response);
	});
</script>
```

## CDN

https://gitcdn.xyz/repo/LiskHQ/lisk-js/development/lisk-js.js<br/>
```html
<script src="https://gitcdn.xyz/repo/LiskHQ/lisk-js/development/lisk-js.js"></script>
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
- [Browser](http://liskhq.github.io/lisk-js/index.html)
- [API](http://liskhq.github.io/lisk-js/example/api.html)
	- [Settings](http://liskhq.github.io/lisk-js/example/api.html#settings_example_1)
	- [Functions](http://liskhq.github.io/lisk-js/example/api.html#functions_listActiveDelegates)
	- [Crypto](http://liskhq.github.io/lisk-js/example/api.html#functions_getKeys)
	- [Transactions](http://liskhq.github.io/lisk-js/example/api.html#functions_createTransaction)
	- [Vote](http://liskhq.github.io/lisk-js/example/api.html#functions_createVote)
	- [Dapp](http://liskhq.github.io/lisk-js/example/api.html#functions_createDapp)
	- [Delegate](http://liskhq.github.io/lisk-js/example/api.html#functions_createDelegate)
	- [Signature](http://liskhq.github.io/lisk-js/example/api.html#functions_createSignature)
- [Experiment (live)](http://liskhq.github.io/lisk-js/example/experiment.html)
	- [GetAccount](http://liskhq.github.io/lisk-js/example/experiment.html#get_account)
	- [SendLSK](http://liskhq.github.io/lisk-js/example/experiment.html#send_lsk)
	- [Sign](http://liskhq.github.io/lisk-js/example/experiment.html#sign)
	- [Verify](http://liskhq.github.io/lisk-js/example/experiment.html#verify)

## Authors

- Boris Povod <boris@crypti.me>
- Oliver Beddows <oliver@lightcurve.io>
- Tobias Schwarz <tobias@lightcurve.io>

## License

Copyright © 2016-2017 Lisk Foundation

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License version 3,
as published by the Free Software Foundation.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License version 3 for more details.

You should have received a copy of the GNU General Public License version 2
along with this program in the file COPYING.txt. If not, see
<https://www.gnu.org/licenses/gpl.txt>

This software also incorporates work previously released with lisk-js 0.2
(and earlier) stable versions under the MIT license. To comply with the
requirements of that license, the permission notice is included in the License file.
