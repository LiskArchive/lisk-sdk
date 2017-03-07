# Lisk JS

Lisk JS is a JavaScript library for sending Lisk transactions. It's main benefit is that it does not require a locally installed Lisk node, and instead utilizes the existing peers on the network. It can be used from the client as a [browserify](http://browserify.org/) compiled module, or on the server as a standard Node.js module.

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0) [![Build Status](https://travis-ci.org/LiskHQ/lisk-js.svg?branch=development)](https://travis-ci.org/LiskHQ/lisk-js) [![Coverage Status](https://coveralls.io/repos/github/LiskHQ/lisk-js/badge.svg?branch=development)](https://coveralls.io/github/LiskHQ/lisk-js?branch=development) [![GitHub release](https://img.shields.io/badge/version-0.3-blue.svg)]()

## Installation

```
npm install lisk-js
```

or for the browser version include:

```
<script src="lisk-js.js"></script>
```

To learn more about the API or to experiment with some data, please go to the github page:

http://liskhq.github.io/lisk-js/

## Tests

```
npm test
```

Tests written using mocha + schedule.js.

## Authors

- Boris Povod <boris@crypti.me>
- Oliver Beddows <oliver@lisk.io>

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