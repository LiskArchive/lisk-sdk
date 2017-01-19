# Lisk

Lisk is a next generation crypto-currency and decentralized application platform, written entirely in JavaScript. For more information please refer to our website: https://lisk.io/.

[![Join the chat at https://gitter.im/LiskHQ/lisk](https://badges.gitter.im/LiskHQ/lisk.svg)](https://gitter.im/LiskHQ/lisk?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Build Status](https://travis-ci.org/LiskHQ/lisk.svg?branch=development)](https://travis-ci.org/LiskHQ/lisk)

**NOTE:** The following information is applicable to: **Ubuntu 14.04 (LTS) - x86_64**.

## Prerequisites

- Nodejs v0.12.17 or higher (<https://nodejs.org/>) -- Nodejs serves as the underlying engine for code execution.

  ```
  curl -sL https://deb.nodesource.com/setup_0.12 | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
  
- Install PostgreSQL (version 9.6.1):

  ```
  curl -sL "https://downloads.lisk.io/scripts/setup_postgresql.Linux" | bash -
  sudo -u postgres createuser --createdb $USER
  createdb lisk_test
  sudo -u postgres psql -d lisk_test -c "alter user "$USER" with password 'password';"
  ```

- Git (<https://github.com/git/git>) -- Used for cloning and updating Lisk

  `sudo apt-get install -y git`

- Bower (<http://bower.io/>) -- Bower helps to install required JavaScript dependencies.

  `sudo npm install -g bower`

- Grunt.js (<http://gruntjs.com/>) -- Grunt is used to compile the frontend code and serves other functions.

  `sudo npm install -g grunt`

- Tool chain components -- Used for compiling dependencies

  `sudo apt-get install -y python build-essential curl automake autoconf libtool`
  
- Forever (<https://github.com/foreverjs/forever>) -- Forever manages the node process for Lisk (Optional)

  `sudo npm install -g forever`

## Installation Steps

Clone the Lisk repository using Git and initialize the modules.

```
git clone https://github.com/LiskHQ/lisk.git
cd lisk
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

## Managing Lisk

To test that Lisk is built and configured correctly, run the following command:

`node app.js`

In a browser navigate to: <http://localhost:7000>. If  Lisk is running on a remote system, switch `localhost` for the external IP Address of the machine.

Once the process is verified as running correctly, `CTRL+C` and start the process with `forever`. This will fork the process into the background and automatically recover the process if it fails.

`forever start app.js`

After the process is started its runtime status and log location can be found by issuing this statement:

`forever list`

To stop Lisk after it has been started with `forever`, issue the following command:

`forever stop app.js`

**NOTE:** The **port**, **address** and **config-path** can be overridden by providing the relevant command switch:

```
forever start app.js -p [port] -a [address] -c [config-path]
```

## Tests

Before running any tests, please ensure Lisk is configured to run on the same testnet that is used by the test-suite.

Replace **config.json** and **genesisBlock.json** with the corresponding files under the **test** directory:

```
cp test/config.json test/genesisBlock.json .
```

**NOTE:** If the node was started with a different genesis block previous, trauncate the database before running tests.

```
dropdb lisk_test
createdb lisk_test
```

**NOTE:** The master passphrase for this genesis block is as follows:

```
wagon stock borrow episode laundry kitten salute link globe zero feed marble
```

Launch Lisk (runs on port 4000):

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

Copyright (c) 2016-2017 Lisk  
Copyright (c) 2014-2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:  

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
