# Lisk Commander

Lisk Commander allows you to communicate with a remote or local node and carry out Lisk-related functionality.

[![Build Status](https://jenkins.lisk.io/buildStatus/icon?job=lisk-commander/development)](https://jenkins.lisk.io/job/lisk-commander/job/development/)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)
<a href="https://david-dm.org/LiskHQ/lisk-commander"><img src="https://david-dm.org/LiskHQ/lisk-commander.svg" alt="Dependency Status"></a>
<a href="https://david-dm.org/LiskHQ/lisk-commander/?type=dev"><img src="https://david-dm.org/LiskHQ/lisk-commander/dev-status.svg" alt="devDependency Status"></a>

## Prerequisites

Lisk Commander requires [Node.js](https://nodejs.org/) as the underlying engine for code execution. Node.js is supported on most operating systems. Follow the instructions for your operating system on the [Node.js downloads page](https://nodejs.org/en/download/). We currently require Node.js versions 8.3 and above. NPM is automatically installed along with Node.js.

## Installation

### From NPM

```sh
$ npm install --global --production lisk-commander
```

Upon successful completion, NPM will add the `lisk-commander` executable `lisk` to your PATH.

### From Source

Clone the Lisk Commander repository using Git and install the dependencies:

```sh
$ git clone https://github.com/LiskHQ/lisk-commander.git
$ cd lisk-commander
$ npm install
```

Before running the executable you will need to build Lisk Commander:

```sh
npm run build
```

#### Adding the Lisk Commander executable to your PATH

WARNING: If you have installed Lisk Commander globally via NPM (see [Install Lisk Commander via NPM](https://lisk.io/documentation/lisk-commander/setup)), following the instructions in this section is not recommended as they will introduce conflicts.

If you would like to add the `lisk` executable to your PATH you have two options: option 1 will install the current state of the code you are installing globally, while option 2 will only link to the code and therefore automatically reflect changes you make going forward.

##### 1. Install globally

Running this command from within the repository will add Lisk Commander to your global NPM packages, and add the `lisk` executable to your PATH. Be aware that any previous globally installed Lisk Commander version will get overridden with this local version.

```sh
$ npm install --global --production
```

Note that you will have to repeat this process for each subsequent build of Lisk Commander.

##### 2. Create a symlink

The other option is to ask NPM to create a symlink in the global folder that links to the package.

```sh
$ npm link
```

This will also add `lisk` to your PATH, but you won't have to repeat the process if you pull or create a new build. Be aware that any previous globally installed Lisk Commander version will get overridden with this local version.

## Usage

<!-- usage -->

```sh-session
$ lisk COMMAND
running command...
$ lisk (-v|--version|version)
lisk-commander/2.0.0 darwin-x64 node-v8.12.0
$ lisk --help [COMMAND]
A command line interface for Lisk

VERSION
  lisk-commander/2.0.0 darwin-x64 node-v8.12.0

USAGE
  $ lisk [COMMAND]

COMMANDS
  account      Commands relating to Lisk accounts.
  block        Commands relating to Lisk blocks.
  config       Manages Lisk Commander configuration.
  copyright    Displays copyright notice.
  delegate     Commands relating to Lisk delegates.
  help         Displays help.
  message      Commands relating to user messages.
  node         Commands relating to Lisk node.
  passphrase   Commands relating to Lisk passphrases.
  signature    Commands relating to signatures for Lisk transactions from multisignature accounts.
  transaction  Commands relating to Lisk transactions.
  warranty     Displays warranty notice.
```

<!-- usagestop -->

## Commands

<!-- commands -->

* [`lisk account`](docs/account.md) - Commands relating to Lisk accounts.
* [`lisk block`](docs/block.md) - Commands relating to Lisk blocks.
* [`lisk config`](docs/config.md) - Manages Lisk Commander configuration.
* [`lisk copyright`](docs/copyright.md) - Displays copyright notice.
* [`lisk delegate`](docs/delegate.md) - Commands relating to Lisk delegates.
* [`lisk help`](docs/help.md) - Displays help.
* [`lisk message`](docs/message.md) - Commands relating to user messages.
* [`lisk node`](docs/node.md) - Commands relating to Lisk node.
* [`lisk passphrase`](docs/passphrase.md) - Commands relating to Lisk passphrases.
* [`lisk signature`](docs/signature.md) - Commands relating to signatures for Lisk transactions from multisignature accounts.
* [`lisk transaction`](docs/transaction.md) - Commands relating to Lisk transactions.
* [`lisk warranty`](docs/warranty.md) - Displays warranty notice.

<!-- commandsstop -->

## Documentation

Further information can be found on our documentation site:

* [Introduction](https://lisk.io/documentation/lisk-commander)
* [Setup](https://lisk.io/documentation/lisk-commander/setup)
* [Upgrade](https://lisk.io/documentation/lisk-commander/upgrade)
* [User Guide](https://lisk.io/documentation/lisk-commander/user-guide)
  * [Sensitive Inputs](https://lisk.io/documentation/lisk-commander/user-guide/sensitive-inputs)
  * [Commands](https://lisk.io/documentation/lisk-commander/user-guide/commands)

## Get Involved

Lisk Commander is an open-source project and all contributions are welcome.

If you find a bug or want to make feature request, please create an [issue](https://github.com/LiskHQ/lisk-commander/issues) with as much detail as you can.

## Run Tests

Lisk Commander has an extensive set of unit tests. To run the tests, please install Lisk Commander from source, and then run the command:

```sh
$ npm test
```

## FAQ

### Something else went wrong. What should I do?

1. Make sure you’re on the network you intend to be on.
1. Remove the configuration file (`config.json`) located in your Lisk Commander configuration directory (`~/.lisk` by default). When you restart Lisk Commander the default configuration will be recreated.
1. Get in contact on [Lisk Chat][] or [Gitter][].
1. If it seems like a bug, open an issue on [GitHub][bugs]. See the [Contribution Guidelines].

## Contributors

https://github.com/LiskHQ/lisk-commander/graphs/contributors

## License

Copyright © 2017–2018 Lisk Foundation

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the [GNU General Public License][license]
along with this program. If not, see <http://www.gnu.org/licenses/>.

[bugs]: https://github.com/LiskHQ/lisk-commander/issues
[contribution guidelines]: docs/CONTRIBUTING.md
[gitter]: https://gitter.im/LiskHQ/lisk
[license]: https://github.com/LiskHQ/lisk-commander/tree/master/LICENSE
[lisk chat]: https://lisk.chat/home
[nvm]: https://github.com/creationix/nvm
