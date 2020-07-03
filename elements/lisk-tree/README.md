# @liskhq/lisk-tree

@liskhq/lisk-tree is containing Merkle tree implementations for use with Lisk-related software

## Installation

```sh
$ npm install --save @liskhq/lisk-tree
```

## Benchmarking

Benchmark results for main lisk-tree functions:

|           Function            | 1000 leaves | 10,000 leaves | 100,000 leaves |
| :---------------------------: | :---------: | :-----------: | :------------: |
|             build             |    45ms     |     240ms     |     2348ms     |
|            append             |     3ms     |      3ms      |      4ms       |
|    generateProof (1 query)    |     5ms     |      5ms      |      6ms       |
|  generateProof (100 queries)  |    50ms     |     125ms     |     172ms      |
| generateProof (1000 queries)  |    56ms     |     114ms     |     168ms      |
| generateProof (10000 queries) |     n/a     |    7993ms     |    14504ms     |
|     verifyProof (1 query)     |     3ms     |      5ms      |      5ms       |
|    verifyProof (100 query)    |    45ms     |     106ms     |     166ms      |
|   verifyProof (1000 query)    |    539ms    |     958ms     |     1592ms     |
|   verifyProof (10000 query)   |     n/a     |    8632ms     |    15909ms     |

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

---

Copyright © 2016-2020 Lisk Foundation

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[lisk core github]: https://github.com/LiskHQ/lisk
[lisk documentation site]: https://lisk.io/documentation/lisk-elements
