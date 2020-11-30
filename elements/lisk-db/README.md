# @liskhq/lisk-db

@liskhq/lisk-db is a database access implementation for use with Lisk-related software.

## Installation

```sh
$ npm install --save @liskhq/lisk-db
```

## Benchmarking

System configuration:

```sh
Ubuntu: 18.04.3 (LTS) x64
8 GB / 4 CPUs
160 GB SSD disk
```

Install dependencies:

```sh
$ npm i
```

Benchmark embedded databases:

Default payload size is 1024, pass payload size according to benchmarking

```sh
$ node ./benchmark/index.js 15000
```

Benchmark results leveldb vs rocksdb (15,000 bytes):

| Operation |         Leveldb          |          Rocksdb          | Winner  | % change |
| :-------: | :----------------------: | :-----------------------: | :-----: | :------: |
|    get    | x 61,274 ops/sec ±13.94% | x 47,785 ops/sec ±14.31%  | Leveldb |    28    |
|    put    | x 22,668 ops/sec ±19.58% | x 32,666 ops/sec ±13.56%  | Rocksdb |    44    |
|    del    | x 51,503 ops/sec ±18.72% | x 51,415 ops/sec ±21.31%  | Leveldb |   0.17   |
|   batch   | x 2,427 ops/sec ±11.34%  | x 105,386 ops/sec ±66.37% | Rocksdb |   4242   |

Benchmark results leveldb vs rocksdb (50,000 bytes):

| Operation |         Leveldb          |          Rocksdb          | Winner  | % change |
| :-------: | :----------------------: | :-----------------------: | :-----: | :------: |
|    get    | x 50,070 ops/sec ±19.63% | x 46,941 ops/sec ±29.65%  | Leveldb |   6.6    |
|    put    | x 14,355 ops/sec ±20.95% |  x 4,483 ops/sec ±24.78%  | Leveldb |   220    |
|    del    | x 50,609 ops/sec ±25.45% | x 39,479 ops/sec ±32.27%  | Leveldb |    28    |
|   batch   |  x 674 ops/sec ±14.39%   | x 133,690 ops/sec ±12.28% | Rocksdb |  19735   |

Benchmark results leveldb vs rocksdb (100,000 bytes):

| Operation |         Leveldb          |          Rocksdb          | Winner  | % change |
| :-------: | :----------------------: | :-----------------------: | :-----: | :------: |
|    get    | x 41,040 ops/sec ±20.37% | x 48,913 ops/sec ±14.79%  | Rocksdb |  19.18   |
|    put    | x 5,446 ops/sec ±19.04%  | x 11,592 ops/sec ±16.66%  | Rocksdb |  112.8   |
|    del    | x 53,184 ops/sec ±31.21% | x 48,948 ops/sec ±10.19%  | Rocksdb |   8.65   |
|   batch   |   x 679 ops/sec ±5.71%   | x 146,248 ops/sec ±20.69% | Rocksdb |  21438   |

Benchmark results leveldb vs rocksdb (150,000 bytes):

| Operation |         Leveldb          |         Rocksdb          | Winner  | % change |
| :-------: | :----------------------: | :----------------------: | :-----: | :------: |
|    get    | x 44,966 ops/sec ±19.13% | x 39,282 ops/sec ±15.83% | Leveldb |  14.46   |
|    put    | x 5,508 ops/sec ±22.79%  | x 8,674 ops/sec ±10.63%  | Rocksdb |  57.48   |
|    del    | x 70,292 ops/sec ±13.37% | x 38,684 ops/sec ±19.42% | Leveldb |  81.70   |
|   batch   |  x 389 ops/sec ±10.68%   | x 81,421 ops/sec ±23.89% | Rocksdb |  20830   |

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
