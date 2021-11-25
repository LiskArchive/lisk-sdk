# @liskhq/lisk-codec

@liskhq/lisk-codec implements decoder and encoder using Lisk JSON schema according to the Lisk protocol.

## Installation

```sh
$ npm install --save @liskhq/lisk-codec
```

## Benchmarks

The following are some benchmarks for version 0.1 of this library used for encoding and decoding different objects both generic and objects similar to the ones in the Lisk networks.

Node version used: v12.17.0. Computer Spec: SSD, 6 Core, 16 GB RAM. No special configuration for Node.

| Object Type                               | Encode (ops/sec) | Decode (ops/sec) |
| ----------------------------------------- | :--------------: | ---------------: |
| Account                                   |      75,081      |           86,908 |
| Transfer Transaction                      |     225,229      |          276,184 |
| Multi-signature registration (64 Members) |      23,539      |           44,231 |
| Block (15 KB transactions)                |      42,349      |           91,180 |

This and additional benchmarks can be found in the `benchmarks` folder

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
[lisk documentation site]: https://lisk.com/documentation/lisk-sdk/references/lisk-elements/codec.html
