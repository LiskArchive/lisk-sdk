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

Copyright © 2016-2018 Lisk Foundation

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the [GNU General Public License](https://github.com/LiskHQ/lisk-elements/tree/master/LICENSE) along with this program. If not, see <http://www.gnu.org/licenses/>.

---

This program also incorporates work previously released with lisk-js `v0.5.2` (and earlier) versions under the [MIT License](https://opensource.org/licenses/MIT). To comply with the requirements of that license, the following permission notice, applicable to those parts of the code only, is included below:

Copyright © 2016-2017 Lisk Foundation

Copyright © 2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[lisk core github]: https://github.com/LiskHQ/lisk
[lisk documentation site]: https://lisk.io/documentation/lisk-elements
