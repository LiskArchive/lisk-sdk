![Logo](../docs/assets/banner_commander.png)

# Lisk Commander

Lisk Commander is a command line tool which allows you to manage a Lisk node instance and interact with a Lisk compatible network.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](http://www.apache.org/licenses/LICENSE-2.0)

## Installation

```sh
$ npm install --global --production lisk-commander
```

Upon successful completion, NPM will add the `lisk-commander` executable `lisk` to your PATH.

## Usage

```sh-session
$ lisk COMMAND
running command...
$ lisk (-v|--version|version)
lisk-commander/4.0.0 darwin-x64 node-v12.18.3
$ lisk --help [COMMAND]
A command line interface for Lisk

VERSION
  lisk-commander/2.0.0 darwin-x64 node-v8.12.0

USAGE
  $ lisk [COMMAND]

COMMANDS
  account             Commands relating to Lisk Core accounts.
  block               Commands relating to Lisk Core blocks.
  blockchain          Commands relating to Lisk Core blockchain data.
  config              Commands relating to Lisk Core node configuration.
  copyright           Displays copyright notice.
  core                Install an instance of Lisk Core.
  delegate            Commands relating to Lisk delegates.
  forger-info         Commands relating to Lisk Core forger-info data.
  forging             Commands relating to Lisk Core forging.
  hash-onion
  help                Displays help.
  message             Commands relating to user messages.
  network-identifier
  node                Commands relating to Lisk Core node.
  passphrase          Commands relating to Lisk Core passphrases.
  sdk                 Commands relating to Lisk SDK development.
  signature           Commands relating to signatures for Lisk transactions from multisignature accounts.
  start               Start Lisk Core Node.
  transaction         Commands relating to Lisk Core transactions.
  warranty            Displays warranty notice.
```

### Running Tests

Lisk Commander has an extensive set of unit tests. To run the tests, please install Lisk Commander from source, and then run the command:

```sh
$ npm test
```

## Get Involved

| Reason                          | How                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Want to chat with our community | [Reach them on Discord](https://discord.gg/lisk)                                               |
| Found a bug                     | [Open a new issue](https://github.com/LiskHQ/lisk/issues/new)                                  |
| Found a security issue          | [See our bounty program](https://blog.lisk.io/announcing-lisk-bug-bounty-program-5895bdd46ed4) |
| Want to share your research     | [Propose your research](https://research.lisk.io)                                              |
| Want to develop with us         | [Create a fork](https://github.com/LiskHQ/lisk/fork)                                           |

## License

Copyright 2016-2019 Lisk Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
