![Logo](../docs/assets/banner_commander.png)

# Lisk Commander

Lisk Commander allows you to communicate with a remote or local node and carry out Lisk-related functionality.

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)

## Installation

```sh
$ npm install --global --production lisk-commander
```

Upon successful completion, NPM will add the `lisk-commander` executable `lisk` to your PATH.

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

### Running Tests

Lisk Commander has an extensive set of unit tests. To run the tests, please install Lisk Commander from source, and then run the command:

```sh
$ npm test
```

## Get Involved

|                           |                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Found a bug               | [Create new issue](https://github.com/LiskHQ/lisk/issues/new)                                                                    |
| Want to develop with us   | [Create a fork](https://github.com/LiskHQ/lisk/fork)                                                                             |
| Have ideas to share       | [Come to Lisk.chat](http://lisk.chat)                                                                                            |
| Want to involve community | [Join community gitter](https://gitter.im/LiskHQ/lisk?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) |
| Found a security issue    | [See our bounty program](https://blog.lisk.io/announcing-lisk-bug-bounty-program-5895bdd46ed4)                                   |

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
