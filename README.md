# lisky
Lisky is the command line interface for Lisk.
Lisky is dedicated to help you finding information in the blockchain and database.
You can monitor your node, setup your delegate, observe how your delegate behaves and optimize forging processes.

[![Build Status](https://jenkins.lisk.io/job/Lisky-pipeline/development)](https://jenkins.lisk.io/job/Lisky-pipeline/job/development/)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)
[![GitHub release](https://img.shields.io/badge/version-0.1.0-blue.svg)](#)

# Install

```
$ npm install -g lisky
```

With a global installation, npm will add the `lisky` executable to your PATH.

# Usage:

```bash
$ lisky

lisky> help

    help [command...]                    Provides help for a given command.
    exit                                 Exits lisky.
    get [options] <type> <input>         Get information from <type> with parameter <input>.
                                         Types available: account, address, block, delegate, transaction
                                         E.g. get delegate lightcurve
                                         e.g. get block 5510510593472232540
    list [options] <type> [variadic...]  Get information from <type> with parameters [input, input, ...].
                                         Types available: accounts, addresses, blocks, delegates, transactions
                                         E.g. list delegates lightcurve tosch
                                         E.g. list blocks 5510510593472232540 16450842638530591789
    set <variable> <value>               Set configuration <variable> to <value>

```


# Settings

| Command | Description |
| --- | --- |
| <code>set json true&#124;false</code> | Sets default to json output (true) or text output (false) |
| <code>set testnet true&#124;false</code> | Set default to testnet (true) or mainnet (false) |

# Run Test

```
$ npm run test
```

# Documentation

If you want to know all the details on this project, as a [user](https://docs.lisk.io/v1.1/docs/user-documentation) and [developer](https://docs.lisk.io/v1.1/docs/developer-documentation), we have created intense documentation on our Readme.


# Get involved

As with every repository on LiskHQ we are working intensively with Github Open-Soruce tools.
If you find a bug, you can create an [Issue](https://github.com/LiskHQ/lisky/issues), please describe it as much in detail as you can.

We would be more than happy if you decide to contribute to this code and make it better on the way. Please have a look at Lisk contribution guidelines before you start.
