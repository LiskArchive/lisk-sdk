![Logo](../docs/assets/banner_commander.png)

# Lisk Commander

Lisk Commander is a command line tool to help developers to build a blockchain application using Lisk Framework.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](http://www.apache.org/licenses/LICENSE-2.0)

## Installation

```sh
$ npm install --global --production lisk-commander
```

Upon successful completion, NPM will add the `lisk-commander` executable `lisk` to your PATH.

## Usage

```shell
$ lisk COMMAND
running command...
$ lisk (-v|--version|version)
lisk-commander/5.0.0 darwin-x64 node-v12.20.0
$ lisk --help [COMMAND]
A command line interface for Lisk

VERSION
  lisk-commander/5.0.0 darwin-x64 node-v12.20.0

USAGE
  $ lisk [COMMAND]

COMMANDS
  account             Commands relating to Lisk accounts.
  autocomplete        display autocomplete installation instructions
  hash-onion
  help                Displays help.
  message             Commands relating to user messages.
  network-identifier
  passphrase          Commands relating to Lisk passphrases.
```

## Autocomplete

To use autocomplete feature for commands & flags follow the instructions after running

```sh
$ lisk autocomplete
```

### Running Tests

Lisk Commander has an extensive set of unit tests. To run the tests, please install Lisk Commander from source, and then run the command:

```sh
$ npm test
```

## Get Involved

| Reason                          | How                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Want to chat with our community | [Reach them on Discord](https://discord.gg/lisk)                                                |
| Found a bug                     | [Open a new issue](https://github.com/LiskHQ/lisk/issues/new)                                   |
| Found a security issue          | [See our bounty program](https://blog.lisk.com/announcing-lisk-bug-bounty-program-5895bdd46ed4) |
| Want to share your research     | [Propose your research](https://research.lisk.com)                                              |
| Want to develop with us         | [Create a fork](https://github.com/LiskHQ/lisk/fork)                                            |

## License

Copyright 2016-2020 Lisk Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
