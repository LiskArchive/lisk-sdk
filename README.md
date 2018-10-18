# Lisk

[![Build Status](https://jenkins.lisk.io/buildStatus/icon?job=lisk-core/development)](https://jenkins.lisk.io/job/lisk-core/job/development)
[![Coverage Status](https://coveralls.io/repos/github/LiskHQ/lisk/badge.svg?branch=development)](https://coveralls.io/github/LiskHQ/lisk?branch=development)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)
[![Join the chat at https://gitter.im/LiskHQ/lisk](https://badges.gitter.im/LiskHQ/lisk.svg)](https://gitter.im/LiskHQ/lisk?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
<a href="https://david-dm.org/LiskHQ/lisk"><img src="https://david-dm.org/LiskHQ/lisk.svg" alt="Dependency Status"></a>
<a href="https://david-dm.org/LiskHQ/lisk/?type=dev"><img src="https://david-dm.org/LiskHQ/lisk/dev-status.svg" alt="devDependency Status"></a>

Lisk is a next generation crypto-currency and decentralized application platform, written entirely in JavaScript. The official documentation about the whole ecosystem can be found in https://lisk.io/documentation.

[Lisk Core](https://lisk.io/documentation/lisk-core) is the program that implements the [Lisk Protocol](https://lisk.io/documentation/lisk-protocol). In other words, Lisk Core is what every machine needs to set-up in order to run a node that allows for participation in the network.

This document details how to install Lisk Core from source, but there are two other ways to participate in the network: [binaries](https://lisk.io/documentation/lisk-core/setup/pre-install/binary) and [Docker images](https://lisk.io/documentation/lisk-core/setup/pre-install/docker).
If you have satisfied the requirements from the Pre-Installation section, you can jumpt directly to the next section [Installation Steps](#installation).

## Index

* [Pre-Installation](#pre-installation)
  * [Create lisk user](#create-new-user-lisk)
  * [Tool Chain Components](#tool-chain-components)
  * [Git](#git)
  * [Node.JS](#nodejs)
  * [PostgreSQL](#postgresql)
  * [Redis (optional)](#redis-optional)
* [Installation](#installation)
* [Managing Lisk](#tool)
* [Configuring Lisk](#configuring-lisk)
  * [Structure](#structure)
  * [Command Line Options](#command-line-options)
  * [Examples](#examples)
* [Tests](#tests)
  * [Preparing Node](#preparing-node)
  * [Running Tests](#running-tests)

## Pre-Installation

The next section details the prerequisites to install Lisk Core from source using the different tagged releases.

### System Install

#### Create new user `lisk`

* Ubuntu:

```
sudo adduser lisk
```

Note: The lisk user itself does not need any sudo rights to run Lisk Core.

#### Tool chain components

Used for compiling dependencies.

* Ubuntu:

```
sudo apt-get update
sudo apt-get install -y python build-essential curl automake autoconf libtool ntp
```

* MacOS 10.12-10.13 (Sierra/High Sierra):

Make sure that you have both [XCode](https://developer.apple.com/xcode/) and [Homebrew](https://brew.sh/) installed on your machine.

Update homebrew and install dependencies:

```
brew update
brew doctor
brew install curl automake autoconf libtool
```

### [Git](https://github.com/git/git)

Used for cloning and updating Lisk

* Ubuntu:

```
sudo apt-get install -y git
```

* MacOS 10.12-10.13 (Sierra/High Sierra):

```
brew install git
```

### [Node.js](https://nodejs.org/)

Node.js serves as the underlying engine for code execution.

Install System wide via package manager:

* Ubuntu:

```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
```

* MacOS 10.12-10.13 (Sierra/High Sierra):

```
brew install node@8.12.0
```

#### Check correct version

Especially when installing on Ubuntu, check if you have a compatible node version runnging:

```
node -v
```

Compare with [package.json](https://github.com/LiskHQ/lisk/blob/development/package.json#L19)

Best practice to manage node version is to install a node version manager like `nvm` or `n`.

##### [nvm](https://github.com/creationix/nvm) (recommended)

1. Login as lisk user, that has been created in the first step:

```
su - lisk
```

2. Install nvm following these [instructions](https://github.com/creationix/nvm#installation)
3. Install the correct version of Node.js using nvm:

```
nvm install 8.12.0
```

For the following steps, logout from the 'lisk' user again with `CTRL+D`, and continue with your user with sudo rights.

### [PM2](https://github.com/Unitech/pm2) (recommended)

PM2 manages the node process for Lisk.

```
npm install -g pm2
```

### PostgreSQL:

* Ubuntu:

Firstly, download and install postgreSQL 9.6:

```
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ $( lsb_release -cs )-pgdg main" |sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt-get update
sudo apt-get install --assume-yes postgresql-9.6 postgresql-contrib-9.6 libpq-dev
```

After installation, you should see the postgres database cluster, by running

```
  pg_lsclusters
```

Drop the existing database cluster, and replace it with a cluster with the locale `en_US.UTF-8`:

```
  sudo pg_dropcluster --stop 9.6 main
  sudo pg_createcluster --locale en_US.UTF-8 --start 9.6 main
```

Create a new database user called `lisk` and grant it rights to create databases:

```
  sudo -u postgres createuser --createdb lisk
```

Create the databases for Testnet and Mainnet:

```
  createdb -O lisk lisk_test
  createdb -O lisk lisk_main
```

Change `'password'` to a secure password of your choice.

```
sudo -u postgres psql -d lisk_test -c "alter user lisk with password 'password';"
sudo -u postgres psql -d lisk_main -c "alter user lisk with password 'password';"
```

* MacOS 10.12-10.13 (Sierra/High Sierra):

```
brew install postgresql@9.6
initdb /usr/local/var/postgres --encoding utf8 --locale=en_US.UTF-8
brew services start postgresql@9.6
createdb lisk_test
createdb lisk_main
```

### Redis (optional)

If you do not plan to use the API of your node for some reason, you can skip this step.

Redis is an optional dependency, that caches database queries that need to be done to answer API requests.

It is recommended to install Redis to improve the performance of API responses.

* Ubuntu:

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

**NOTE:** Lisk does not run on the Redis default port of 6379. Instead it is configured to run on port: 6380. Because of this, in order for Lisk to run, you have one of two options:

1. **Change the Redis launch configuration**

Update the launch configuration file on your system. Note that there are a number of ways to do this.

The following is one example:

1. Stop redis-server
2. Edit the file `redis.conf` and change: `port 6379` to `port 6380`
   * Ubuntu: `/etc/redis/redis.conf`
   * MacOS: `/usr/local/etc/redis.conf`
3. Start redis-server

Now confirm that redis is running on `port 6380`:

```
redis-cli -p 6380
ping
```

And you should get the result `PONG`.

2. **Change the Lisk configuration**

To update the redis port in the Lisk configuration, check the section [Configuring Lisk](#configuring-lisk)

## Installation

Clone the Lisk Core repository using Git and initialize the modules.

```
git clone https://github.com/LiskHQ/lisk.git
cd lisk
git checkout master
npm install
```

## Managing Lisk

To test Lisk is built and configured correctly, issue the following command:

```
node app.js
```

This will start the lisk instance with `devnet` configuration. Once the process is verified as running correctly, `CTRL+C` and start the process with `pm2`.
This will fork the process into the background and automatically recover the process if it fails.

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
pm2 start --name lisk app.js -- -p [port] -a [address] -c [config-path] -n [network]
```

You can pass any of `devnet`, `alphanet`, `betanet`, `testnet` or `mainnet` for the network option.

## Configuring Lisk

### Structure

1. The Lisk configuration is managed under different folder structures.
2. Root folder for all configuration is `./config/`.
3. Default configuration file that used as base is `config/default/config.json`
4. You can find network specific configurations under `config/<network>/config.json`
5. Don't override any value in above mentioned files if you need custom configuration.
6. Create your own `json` file and pass it as command line options `-c` or `LISK_CONFIG_FILE`
7. Configurations will be loaded in following order, lowest in the list have highest priority:
   * Default configuration file
   * Network specific configuration file
   * Custom configuration file (if specified by user)
   * Command line configurations, specified as command `flags` or `env` variables
8. Any config option of array type gets completely overridden. If you specify one peer at `peers.list` in your custom config file, it will replace every default peer for the network.
9. For development use `devnet` as the network option.

### Command Line Options

There are plenty of options available that you can use to override configuration on runtime while starting the lisk.

```
node app.js [options]
```

Each of that option can be appended on command line. There are also few `ENV` variables that can be utilized for this purpose.

| Option                               | ENV Variable           | Config Option            | Description                                                                                                                                                                       |
| ------------------------------------ | ---------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <pre nowrap>--network<br>-n</pre>    | LISK_NETWORK           |                          | Which configurations set to use, associated to lisk networks. Any of this option can be used `devnet`, `alphanet`, `betanet`, `testnet` and `mainnet`. Default value is `devnet`. |
| <pre nowrap>--config<br> -c</pre>    | LISK_CONFIG_FILE       |                          | Path the custom configuration file, which will override values of `config/default/config.json`                                                                                    |
| <pre nowrap>--port<br> -p</pre>      | LISK_WS_PORT           | wsPort                   | TCP port for P2P layer                                                                                                                                                            |
| <pre nowrap>--http-port<br> -h</pre> | LISK_HTTP_PORT         | httpPort                 | TCP port for HTTP API                                                                                                                                                             |
| <pre nowrap>--address<br> -a</pre>   | LISK_ADDRESS           | address                  | Listening host name or ip                                                                                                                                                         |
| <pre nowrap>--log<br> -l</pre>       | LISK_FILE_LOG_LEVEL    | fileLogLevel             | Log level for file output                                                                                                                                                         |
|                                      | LISK_CONSOLE_LOG_LEVEL | consoleLogLevel          | Log level for console output                                                                                                                                                      |
|                                      | LISK_CACHE_ENABLED     | cacheEnabled             | Enable or disable cache. Must be set to true/false                                                                                                                                |
| <pre nowrap>--database<br> -d</pre>  | LISK_DB_NAME           | db.database              | PostgreSQL database name to connect                                                                                                                                               |
|                                      | LISK_DB_HOST           | db.host                  | PostgreSQL database host name                                                                                                                                                     |
|                                      | LISK_DB_PORT           | db.port                  | PostgreSQL database port                                                                                                                                                          |
|                                      | LISK_DB_USER           | db.user                  | PostgreSQL database username to connect                                                                                                                                           |
|                                      | LISK_DB_PASSWORD       | db.password              | PostgreSQL database password to connect                                                                                                                                           |
| <pre nowrap>--peers<br> -p</pre>     | LISK_PEERS             | peers.list               | Comma separated list of peers to connect in the format `192.168.99.100:5000,172.169.99.77:5000`                                                                                   |
|                                      | LISK_API_PUBLIC        | api.access.public        | Enable or disable public access of http API. Must be set to true/false                                                                                                            |
|                                      | LISK_API_WHITELIST     | api.access.whiteList     | Comma separated list of IPs to enable API access. Format `192.168.99.100,172.169.99.77`                                                                                           |
|                                      | LISK_FORGING_DELEGATES | forging.delegates        | Comma separated list of delegates to load in the format _publicKey&#x7c;encryptedPassphrase,publicKey2&#x7c;encryptedPassphrase2_                                                 |
|                                      | LISK_FORGING_WHITELIST | forging.access.whiteList | Comma separated list of IPs to enable access to forging endpoints. Format `192.168.99.100,172.169.99.77`                                                                          |
| <pre nowrap>--snapshot<br> -s</pre>  |                        |                          | Number of round for which take the snapshot. If none specified it will use the highest round available.                                                                           |

#### Note

* All `ENV` variables restricted with operating system constraint of `ENV` variable maximum length.
* Comma separated lists will replace the original config values. e.g. If you specify `LISK_PEERS`, original `peers.list` specific to network will be replaced completely.

For more detail understanding of configuration read this [online documentation](https://lisk.io/documentation/lisk-core/user-guide/configuration)

### Examples

#### Change Redis Port

Update the `redis.port` configuration attribute in `config/devnet/config.json` or any other network you want to configure.

## Tests

### Preparing Node

1. Recreate the database in order to run the tests against a new blockchain:

```
dropdb lisk_dev
createdb lisk_dev
```

2. Launch Lisk (runs on port 4000):

```
NODE_ENV=test node app.js
```

### Running Tests

Tests are run using the following command:

```
npm test -- mocha:<tag>:<suite>:[section]
```

* Where **tag** can be one of `default | unstable | slow | extensive` (required)
* Where **suite** can be one of `unit | integration | functional | network` (required)
* Where **section** depending of the chosen suite can be:
  * when `functional` --> `get | post | ws` (optional)

Examples:

```
npm test -- mocha:slow:unit
npm test -- mocha:extensive:integration
npm test -- mocha:default:functional
npm test -- mocha:unstable:functional:get
npm test -- mocha:untagged:network
```

Individual test files can be run using the following command:

```
npm run mocha -- path/to/test.js
```

## Utility scripts

There are couple of command line scripts that facilitate users of lisk to perform handy operations. All scripts are located under `./scripts/` directory and can be executed directly by `node scripts/<file_name>`.

#### Generate Config

This script will help you to generate unified version of configuration file for any network. Here is the usage of the script:

```
Usage: generate_config [options] <network>

Options:

  -h, --help     output usage information
  -V, --version  output the version number
```

Argument `network` is required and can by `devnet`, `testnet`, `mainnet` or any other network folder available under `./config` directory.

#### Update Config

This script keep track of all changes introduced in Lisk over time in different versions. If you have one config file in any of specific version and you want to make it compatible with other version of the Lisk, this scripts will do it for you.

```
Usage: update_config [options] <input_file> <from_version> [to_version]

Options:

-h, --help     output usage information
-V, --version  output the version number
--output       Output file path
--diff         Show only difference from default config file.
```

As you can see from the usage guide, `input_file` and `from_version` are required. So if you have a config file, you must be aware to which version of Lisk this belongs. You can skip the `to_version` argument and it will apply changes up-to latest version of Lisk. If you don't specify `--output` path the final config json will be printed to console. Option `--diff` is useful if you just want to know what are the changes in your version compared to default config located in `./config/default/config.json`.

#### Console

This script is really useful in development. It will initialize the components of Lisk and load these into Node.js REPL.

```
node scripts/console.js

initApplication: Application initialization inside test environment started...
initApplication: Target database - lisk_dev
initApplication: Rewired modules available
initApplication: Fake onBlockchainReady event called
initApplication: Loading delegates...
initApplication: Delegates loaded from config file - 101
initApplication: Done
lisk-core [lisk_dev] >
```

Once you get the prompt, you can use `modules`, `helpers`, `logic`, `db` and `config` objects and play with these in REPL.

## Performance Monitoring

We used [newrelic](http://newrelic.com/) to monitor the activities inside application. It enables to have detail insight
of the system and keep track of performance of each activity. e.g. An HTTP API call or a background job from queue.

To enable the performance monitoring on your node make sure you have an environment variable `NEW_RELIC_LICENSE_KEY`
available and set and then start the node normally. The monitoring data will be visible to your newrelic account with the
name of the network you started. e.g. `lisk-mainnet`, `lisk-testnet`.

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
