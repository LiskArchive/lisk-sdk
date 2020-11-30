# @liskhq/lisk-cryptography

@liskhq/lisk-cryptography is containing general cryptographic functions for use with Lisk-related software

## Installation

```sh
$ npm install --save @liskhq/lisk-cryptography
```

## Benchmarking

Install optional dependencies:

```sh
$ npm i -D benchmark sodium-native
```

Benchmark nacl functions:

```sh
$ npx babel-node ./benchmark/nacl
```

Benchmark results for nacl functions:

|    Function    |           Fast           |           Slow           | Winner |
| :------------: | :----------------------: | :----------------------: | :----: |
|      box       | x 23,982 ops/sec ±0.59%  |   x 771 ops/sec ±0.44%   |  Fast  |
|    openBox     | x 24,247 ops/sec ±0.42%  |   x 770 ops/sec ±0.69%   |  Fast  |
|  signDetached  | x 46,402 ops/sec ±0.32%  |   x 236 ops/sec ±1.63%   |  Fast  |
| verifyDetached | x 17,153 ops/sec ±0.19%  |   x 122 ops/sec ±0.61%   |  Fast  |
| getRandomBytes | x 207,866 ops/sec ±0.23% | x 299,959 ops/sec ±0.39% |  Slow  |
|   getKeyPair   | x 38,815 ops/sec ±0.16%  |   x 242 ops/sec ±0.62%   |  Fast  |

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

[lisk core github]: https://github.com/LiskHQ/lisk
[lisk documentation site]: https://lisk.io/documentation/lisk-elements
