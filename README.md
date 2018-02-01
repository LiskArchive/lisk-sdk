# Lisk

Lisk is a next generation crypto-currency and decentralized application platform, written entirely in JavaScript. For more information please refer to our website: https://lisk.io/.

[![Build Status](https://jenkins.lisk.io/buildStatus/icon?job=lisk-core/development)](https://jenkins.lisk.io/job/lisk-core/job/development)
[![Coverage Status](https://coveralls.io/repos/github/LiskHQ/lisk/badge.svg?branch=development)](https://coveralls.io/github/LiskHQ/lisk?branch=development)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)
[![Join the chat at https://gitter.im/LiskHQ/lisk](https://badges.gitter.im/LiskHQ/lisk.svg)](https://gitter.im/LiskHQ/lisk?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
<a href="https://david-dm.org/LiskHQ/lisk"><img src="https://david-dm.org/LiskHQ/lisk.svg" alt="Dependency Status"></a>
<a href="https://david-dm.org/LiskHQ/lisk/?type=dev"><img src="https://david-dm.org/LiskHQ/lisk/dev-status.svg" alt="devDependency Status"></a>

## Prerequisites - In order

This sections provides details on what you need install on your system in order to run Lisk.

### System Install

* Tool chain components -- Used for compiling dependencies

  * Ubuntu/Debian:

    ```
    sudo apt-get update
    sudo apt-get install -y python build-essential curl automake autoconf libtool
    ```

  * MacOS 10.12-10.13 (Sierra/High Sierra):

    Make sure that you have both [XCode](https://developer.apple.com/xcode/) and [Homebrew](https://brew.sh/) installed on your machine.

    Update homebrew and install dependencies:

    ```
    brew update
    brew doctor
    brew install curl automake autoconf libtool
    ```

* Git (<https://github.com/git/git>) -- Used for cloning and updating Lisk

  * Ubuntu/Debian:

    ```
    sudo apt-get install -y git
    ```

  * MacOS 10.12-10.13 (Sierra/High Sierra):

    ```
    brew install git
    ```

### Node.js (<https://nodejs.org/>)

* Node.js serves as the underlying engine for code execution.

  Install System wide via package manager:

  * Ubuntu/Debian:

    ```
    curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

  * MacOS 10.12-10.13 (Sierra/High Sierra):

    ```
    brew install node@6.12.3
    ```

* _(Recommended)_ Install using a version manager such as nvm.

  1. Install nvm following their instructions (https://github.com/creationix/nvm#installation)
  2. Install the correct version of Node.js using nvm:

  ```
  nvm install 6.12.3
  ```

* _(Recommended)_ PM2 (<https://github.com/Unitech/pm2>) -- PM2 manages the node process for Lisk

  ```
  npm install -g pm2
  ```

### PostgreSQL (version 9.6):

* Ubuntu/Debian:

  ```
  curl -sL "https://downloads.lisk.io/scripts/setup_postgresql.Linux" | bash -
  sudo -u postgres createuser --createdb $USER
  createdb lisk_test
  createdb lisk_main
  sudo -u postgres psql -d lisk_test -c "alter user "$USER" with password 'password';"
  sudo -u postgres psql -d lisk_main -c "alter user "$USER" with password 'password';"
  ```

* MacOS 10.12-10.13 (Sierra/High Sierra):

  ```
  brew install postgresql@9.6
  initdb /usr/local/var/postgres -E utf8
  brew services start postgresql@9.6
  createdb lisk_test
  createdb lisk_main
  ```

### Installing Redis

* Ubuntu/Debian:

  ```
  sudo apt-get install redis-server
  ```

  Start redis:

  ```
  service redis start
  ```

  Stop redis:

  ```
  service redis stop
  ```

* MacOS 10.12-10.13 (Sierra/High Sierra):

  ```
  brew install redis
  ```

  Start redis:

  ```
  brew services start redis
  ```

  Stop redis:

  ```
  brew services stop redis
  ```

**NOTE:** Lisk does not run on the redis default port of 6379. Instead it is configured to run on port: 6380. Because of this, in order for Lisk to run, you have one of two options:

1. **Change the Lisk configuration**

Update the redis port configuration in both `config.json` and `test/data/config.json`. Note that this is the easiest option, however, be mindful of reverting the changes should you make a pull request.

2. **Change the Redis launch configuration**

Update the launch configuration file on your system. Note that their a number of ways to do this. The following is one way:

1. Stop redis-server
2. Edit the file `redis.conf` and change: `port 6379` to `port 6380`
   * Ubuntu/Debian: `/etc/redis/redis.conf`
   * MacOS: `/usr/local/etc/redis.conf`
3. Start redis-server

Now confirm that redis is running on `port 6380`:

```
redis-cli -p 6380
ping
```

And you should get the result `PONG`.

## Installation Steps

Clone the Lisk repository using git and initialize the modules.

```
git clone https://github.com/LiskHQ/lisk.git
cd lisk
git checkout master
npm install
```

## Managing Lisk

To test that Lisk is built and configured correctly, issue the following command:

```
node app.js
```

Once the process is verified as running correctly, `CTRL+C` and start the process with `pm2`. This will fork the process into the background and automatically recover the process if it fails.

```
pm2 start --name lisk app.js
```

After the process is started, its runtime status and log location can be retrieved by issuing the following command:

```
pm2 show lisk
```

To stop Lisk after it has been started with `pm2`, issue the following command:

```
pm2 stop lisk
```

**NOTE:** The **port**, **address** and **config-path** can be overridden by providing the relevant command switch:

```
pm2 start --name lisk app.js -- -p [port] -a [address] -c [config-path]
```

## Tests

### Preparing Node

1. Recreate the database in order to run the tests against a new blockchain:

```
dropdb lisk_test
createdb lisk_test
```

2. Ensure Lisk is configured to run on the same local network used by the tests. Replace the files **config.json** and **genesis_block.json** with those located under the **test/data** directory:

```
cp test/data/config.json test/data/genesis_block.json .
```

3. Launch Lisk (runs on port 4000):

```
NODE_ENV=test node app.js
```

### Running Tests

Tests are run using the following command:

```
npm test -- mocha:<tag>:<suite>:[section]
```

* Where **tag** can be one of `slow | unstable | untagged | extensive` (required)
* Where **suite** can be one of `unit | functional | integration` (required)
* Where **section** depending of the chosen suite can be:
  * when `functional` --> `get | post | ws | system` (optional)

Individual test files can be run using the following command:

```
npm run mocha -- path/to/test.js
```

### Genesis Account

The master passphrase for the genesis block used by the tests is as follows:

```
wagon stock borrow episode laundry kitten salute link globe zero feed marble
```

## Contributors

https://github.com/LiskHQ/lisk/graphs/contributors

## License

Copyright © 2016-2018 Lisk Foundation

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the [GNU General Public License](https://github.com/LiskHQ/lisk/tree/master/LICENSE) along with this program. If not, see <http://www.gnu.org/licenses/>.

---

This program also incorporates work previously released with lisk `0.9.11` (and earlier) versions under the [MIT License](https://opensource.org/licenses/MIT). To comply with the requirements of that license, the following permission notice, applicable to those parts of the code only, is included below:

Copyright © 2016-2018 Lisk Foundation
Copyright © 2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
