![Logo](../docs/assets/banner_framework.png)

# Lisk Framework

[![Build Status](https://jenkins.lisk.io/buildStatus/icon?job=lisk-core/development)](https://jenkins.lisk.io/job/lisk-core/job/development)
[![Coverage Status](https://coveralls.io/repos/github/LiskHQ/lisk/badge.svg?branch=development)](https://coveralls.io/github/LiskHQ/lisk?branch=development)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)
<a href="https://david-dm.org/LiskHQ/lisk"><img src="https://david-dm.org/LiskHQ/lisk.svg" alt="Dependency Status"></a>
<a href="https://david-dm.org/LiskHQ/lisk/?type=dev"><img src="https://david-dm.org/LiskHQ/lisk/dev-status.svg" alt="devDependency Status"></a>

## What is Lisk Framework

Lisk Framework is an application framework responsible for establishing and maintaining the interactions between the modules of a Lisk blockchain application.

Lisk Framework aims to provide a consistent and intuitive interface between each module and component. Currently, Lisk Framework establishes interactions between the `chain`, `api` and `network` modules.

### Architecture Overview

The architecture of Lisk Framework follows the research documented in [LIP0005](https://github.com/LiskHQ/lips/blob/master/proposals/lip-0005.md). The diagram below provides a high-level overview of the architecture:

![Logo](./docs/assets/diagram_framework.png)

## Installation and usage

To install and use Lisk Framework follow the steps described in the [Lisk SDK installation](https://github.com/LiskHQ/lisk-sdk#installation) and [usage](https://github.com/LiskHQ/lisk-sdk#usage) sections.

## Tests

### Preparing Node

1. Recreate the database to run the tests against a new blockchain:

```
dropdb lisk_dev
createdb lisk_dev
```

2. Launch Lisk (runs on port 4000):

```
NODE_ENV=test npm start
```

### Running Tests

Starting from version `1.6.0`, Lisk Framework will be using [Jest](https://jestjs.io) as its main test runner with gradual deprecation of [mocha](https://mochajs.org). Since rewriting all existing mocha tests is not feasible at the moment, we have two test runners in our code base:

- Modules (all source code under `framework/src/modules` folder) will be tested using `mocha` and test files should be located under `framework/test/mocha`.
- Framework (all of the source files but `framework/src/modules`) will be tested using `jest` and test files should be located under `framework/test/jest`.
- Functional and Network tests suites will be using `mocha` and test files should be located under `framework/test/mocha`.

#### Running Mocha Tests

Tests are run using the following command:

```
npm run mocha:<testType> -- [testPathPattern] [mochaCliOptions]
```

- Where **testType** can be one of `unit`, `integration`, `functional:ws`, `functional:get`, `functional:post`, `functional:put`, `functional`, `network` (required).
- Where **testPathPattern** is a regexp pattern string that is matched against all tests paths before executing the test (optional).
- Where **mochaCliOptions** can be any of mocha's [`command line options`](https://mochajs.org/#command-line-usage) (optional).

Examples:

```
# Running network tests
npm run mocha:network
npm run mocha:network -- --grep @p2p
npm run mocha:network -- --grep @propagation

# Running unit tests
npm run mocha:unit
npm run mocha:unit -- --grep @slow
npm run mocha:unit -- --grep @unstable
### extensive
npm run mocha:unit -- --grep="@unstable" --invert

# Running integration tests
npm run mocha:integration -- --grep @slow
npm run mocha:integration -- --grep @unstable
# extensive
npm run mocha:integration -- --grep="@unstable" --invert

# Running functional tests
npm run mocha:functional:ws
npm run mocha:functional:get
npm run mocha:functional:post
npm run mocha:functional:put
```

Individual test files can be run using the following commands:

```bash
npm run mocha:unit -- <testPathPattern> [mochaCliOptions]
```

or

```bash
npm run mocha <filepath> [mochaCliOptions]
```

or

```bash
npx mocha <filepath> [mochaCliOptions]
```

#### Running Jest Tests

```
npm run jest:<testType>
```

`testType` can be `unit`|`integration`|`functional`

##### Executing the tests per file:

```
npm run jest:<testType> -- [testPathPattern] [jestCliOptions]
```

## Get Involved

| Reason                           | How                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| Want to chat with our community  | [Chat with them on Lisk.chat](http://lisk.chat)                                                |
| Want to chat with our developers | [Chat with them on Gitter](https://gitter.im/LiskHQ/lisk)                                      |
| Found a bug                      | [Open a new issue](https://github.com/LiskHQ/lisk/issues/new)                                  |
| Found a security issue           | [See our bounty program](https://blog.lisk.io/announcing-lisk-bug-bounty-program-5895bdd46ed4) |
| Want to share your research      | [Propose your research](https://research.lisk.io)                                              |
| Want to develop with us          | [Create a fork](https://github.com/LiskHQ/lisk/fork)                                           |

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
