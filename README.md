# lisky

Lisky allows you to communicate with a remote or local node and carry out Lisk-related functionality using an interactive or non-interactive command line tool.

[![Build Status](https://jenkins.lisk.io/buildStatus/icon?job=lisky/development)](https://jenkins.lisk.io/job/lisky/job/development/)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)
<a href="https://david-dm.org/LiskHQ/lisky"><img src="https://david-dm.org/LiskHQ/lisky.svg" alt="Dependency Status"></a>
<a href="https://david-dm.org/LiskHQ/lisky/?type=dev"><img src="https://david-dm.org/LiskHQ/lisky/dev-status.svg" alt="devDependency Status"></a>

## Prerequisites

Lisky requires [Node.js](https://nodejs.org/) as the underlying engine for code execution. Node.js is supported on most operating systems. Follow the instructions for your operating system on the [Node.js downloads page](https://nodejs.org/en/download/). You will need version 6.11.x or higher. NPM is automatically installed along with Node.js.

## Installation

### From NPM

```sh
$ npm install --global --production lisky
```

Upon successful completion, NPM will add the `lisky` executable to your PATH.

### From Source

Clone the Lisky repository using Git and install the dependencies:

```sh
$ git clone https://github.com/LiskHQ/lisky.git
$ cd lisky
$ npm install
```

Before running the executable you will need to build Lisky:

```sh
npm run build
```

#### Adding the Lisky executable to your PATH

WARNING: If you have installed Lisky globally via NPM (see [Install Lisky via NPM](docs:lisky-installation-npm)), following the instructions in this section is not recommended as they will introduce conflicts.

If you would like to add the `lisky` executable to your PATH you have two options: option 1 will install the current state of the code you are installing globally, while option 2 will only link to the code and therefore automatically reflect changes you make going forward.

##### 1. Install globally

Running this command from within the repository will add Lisky to your global NPM packages, and add the `lisky` executable to your PATH. Be aware that any previous globally installed lisky version will get overridden with this local version.

```sh
$ npm install --global --production
```

Note that you will have to repeat this process for each subsequent build of Lisky.

##### 2. Create a symlink

The other option is to ask NPM to create a symlink in the global folder that links to the package.

```sh
$ npm link
```

This will also add `lisky` to your PATH, but you won't have to repeat the process if you pull or create a new build. Be aware that any previous globally installed lisky version will get overridden with this local version.

## Usage

### Interactive use

To run commands interactively:

```sh
$ lisky
 _ _     _
| (_)___| | ___   _
| | / __| |/ / | | |
| | \__ \   <| |_| |
|_|_|___/_|\_\\__, |
              |___/

Running v0.1.3. Copyright (C) 2017 Lisk Foundation
Type `help` to get started.

lisky> help

  Commands:

    help [command...]                    Provides help for a given command.
    exit                                 Exits lisky.
    env                                  Print environmental configuration.
    get [options] <type> <input>         Get information from <type> with parameter <input>.
                                         Types available: account, address, block, delegate, transaction
                                         E.g. get delegate lightcurve
                                         e.g. get block 5510510593472232540
    list [options] <type> <variadic...>  Get information from <type> with parameters <input, input, ...>.
                                         Types available: accounts, addresses, blocks, delegates, transactions
                                         E.g. list delegates lightcurve tosch
                                         E.g. list blocks 5510510593472232540 16450842638530591789
    set <variable> <value>               Set configuration <variable> to <value>. Configuration is
                                         persisted in `~/.lisky/config.json`.
lisky>
```

### Non-interactive use

To run commands and options directly from the command line:

```sh
$ lisky get delegate lightcurve --json
```

## Settings

Configuration is stored in a config file placed in the user's home directory (run `help set` to see the exact location). If this is unavailable a default configuration is used. The following settings can be updated (and will be persisted if possible):

| Command                                  | Description                                               |
| ---------------------------------------- | --------------------------------------------------------- |
| <code>set json true&#124;false</code>    | Sets default to JSON output (true) or text output (false) |
| <code>set testnet true&#124;false</code> | Set default to testnet (true) or mainnet (false)          |

## Documentation

Further information can be found on our documentation site:

* [Introduction](https://docs.lisk.io/v1.3/docs/lisky-introduction)
* [Pre-Installation](https://docs.lisk.io/v1.3/docs/lisky-pre-installation)
* [Installation](https://docs.lisk.io/v1.3/docs/lisky-installation)
  * [Install-from-NPM](https://docs.lisk.io/v1.3/docs/lisky-installation-npm)
  * [Install-from-Source](https://docs.lisk.io/v1.3/docs/lisky-installation-source)
* [Upgrading](https://docs.lisk.io/v1.3/docs/lisky-upgrading)
  * [Upgrading-from-NPM](https://docs.lisk.io/v1.3/docs/lisky-upgrading-npm)
  * [Upgrading-from-Source](https://docs.lisk.io/v1.3/docs/lisky-upgrading-source)
* [Usage](https://docs.lisk.io/v1.3/docs/lisky-usage)
  * [Configuration](https://docs.lisk.io/v1.3/docs/lisky-usage-configuration)
  * [Usage](https://docs.lisk.io/v1.3/docs/lisky-usage-interactive-and-noninteractive)
  * [Commands](https://docs.lisk.io/v1.3/docs/lisky-usage-commands)

## Get Involved

Lisky is an open-source project and all contributions are welcome.

If you find a bug or want to make feature request, please create an [issue](https://github.com/LiskHQ/lisky/issues) with as much detail as you can.

## Run Tests

Lisky has an extensive set of unit tests. To run the tests, please install lisky from source, and then run the command:

```sh
$ npm test
```

## FAQ

### Why won’t Lisky start with my version of Node.js?

> You try to run Lisky and it tells you `ERROR: Requires Node.js version 6.14.1, but was started with version 8.11.1.`

Because of the sensitive nature of Lisky’s functionality, we want to make absolutely sure that when our users are using Lisky it behaves as expected. Currently we only perform substantial tests with a single version of Node.js, so we require our users to use that specific version to avoid unforeseen behavior discrepancies.

In the future we would like to support a wider range of Node.js versions, but until then we recommend using a Node.js version manager, such as [nvm][], to make it easy to switch between different Node.js versions.

### Why do I get an error regarding a config lockfile?

> You try to run Lisky and it tells you `Config lockfile at ~/.lisky/config.lock found. Are you running Lisky in another process?`

When you start Lisky, either in interactive or non-interactive-mode, we create a lockfile to prevent you from making changes to your configuration file. If for some reason either Lisky or your computer crashes, this lockfile might not be removed, and Lisky will prevent you from starting a new instance even though no Lisky instance is currently running. In this case it’s safe to remove the lockfile.

The lockfile is located in your Lisky configuration directory. The error message above will give you the location of the file if you want to remove if manually, or you can run `lisky clean` and Lisky will remove it for you.

### Something else went wrong. What should I do?

1. Make sure you’re on the network you intend to be on.
1. Exit Lisky (if in interactive mode) and restart.
1. Remove the configuration file (`config.json`) located in your Lisky configuration directory (`~/.lisky` by default). When you restart Lisky the default configuration will be recreated.
1. Get in contact on [Lisk Chat][] or [Gitter][].
1. If it seems like a bug, open an issue on [GitHub][bugs]. See the [Contribution Guidelines].

## Contributors

https://github.com/LiskHQ/lisky/graphs/contributors

## License

Copyright © 2016–2018 Lisk Foundation

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the [GNU General Public License][license]
along with this program. If not, see <http://www.gnu.org/licenses/>.

[bugs]: https://github.com/LiskHQ/lisky/issues
[contribution guidelines]: docs/CONTRIBUTING.md
[gitter]: https://gitter.im/LiskHQ/lisk
[license]: https://github.com/LiskHQ/lisky/tree/master/LICENSE
[lisk chat]: https://lisk.chat/home
[nvm]: https://github.com/creationix/nvm
