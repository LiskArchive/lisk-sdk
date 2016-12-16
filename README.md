# Lisk

Lisk is a next generation crypto-currency and decentralized application platform, written entirely in JavaScript. For more information please refer to our website: https://lisk.io/.

[![Join the chat at https://gitter.im/LiskHQ/lisk](https://badges.gitter.im/LiskHQ/lisk.svg)](https://gitter.im/LiskHQ/lisk?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Build Status](https://travis-ci.org/LiskHQ/lisk.svg?branch=development)](https://travis-ci.org/LiskHQ/lisk)

## Installation

**NOTE:** The following is applicable to: **Ubuntu 14.04 (LTS) - x86_64**.

Install essentials:

```
sudo apt-get update
sudo apt-get install -y autoconf automake build-essential curl git libtool python
```

Install PostgreSQL (version 9.5.2):

```
curl -sL "https://downloads.lisk.io/scripts/setup_postgresql.Linux" | bash -
sudo -u postgres createuser --createdb $USER
createdb lisk_test
sudo -u postgres psql -d lisk_test -c "alter user "$USER" with password 'password';"
```

Install Node.js (version 0.12.x) + npm:

```
curl -sL https://deb.nodesource.com/setup_0.12 | sudo -E bash -
sudo apt-get install -y nodejs
```

Install grunt-cli (globally):

```
sudo npm install grunt-cli -g
```

Install bower (globally):

```
sudo npm install bower -g
```

Install node modules:

```
npm install
```

Install Lisk Node, a specialized version of Node.js used to execute dapps within a virtual machine:

```
wget https://downloads.lisk.io/lisk-node/lisk-node-Linux-x86_64.tar.gz
tar -zxvf lisk-node-Linux-x86_64.tar.gz
```

Lisk Node has to be in `[LISK_DIR]/nodejs/node`.

Load git submodules ([lisk-ui](https://github.com/LiskHQ/lisk-ui) and [lisk-js](https://github.com/LiskHQ/lisk-js)):

```
git submodule init
git submodule update
```

Build the user-interface:

```
cd public
npm install
bower install
grunt release
```

## Launch

To launch Lisk:

```
node app.js
```

**NOTE:** The **port**, **address** and **config-path** can be overridden by providing the relevant command switch:

```
node app.js -p [port] -a [address] -c [config-path]
```

## Tests

Before running any tests, please ensure Lisk is configured to run on the same testnet as used by the test-suite.

Replace **config.json** and **genesisBlock.json** with the corresponding files under the **test** directory:

```
cp test/config.json test/genesisBlock.json .
```

**NOTE:** The master passphrase for this genesis block is as follows:

```
wagon stock borrow episode laundry kitten salute link globe zero feed marble
```

Launch lisk (runs on port 4000):

```
node app.js
```

Run the test suite:

```
npm test
```

Run individual tests:

```
npm test -- test/lib/accounts.js
npm test -- test/lib/transactions.js
```

## Authors

- Boris Povod <boris@crypti.me>
- Pavel Nekrasov <landgraf.paul@gmail.com>
- Sebastian Stupurac <stupurac.sebastian@gmail.com>
- Oliver Beddows <oliver@lisk.io>

## License

The MIT License (MIT)

Copyright (c) 2016 Lisk  
Copyright (c) 2014-2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:  

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
