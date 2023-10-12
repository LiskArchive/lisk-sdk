# @liskhq/lisk-framework-chain-connector-plugin

@liskhq/lisk-framework-chain-connector-plugin is a plugin for creating and sending Cross-Chain-Update (CCU) Transactions.

Cross-chain update transactions are the carriers of the information transmitted between chains. By posting a cross-chain update, the receiving chain gets the information required about the advancement of the sending chain. The transaction can also include cross-chain messages and thus serves as an envelope for messages from one chain to another.

## Installation

```sh
$ npm install --save @liskhq/lisk-framework-chain-connector-plugin
```

## Config Options

```
{
	receivingChainID: string,
	receivingChainWsURL?: string,
	receivingChainIPCPath?: string,
	ccuFrequency: number,
	encryptedPrivateKey: string,
	ccuFee: string,
	isSaveCCU: boolean,
	maxCCUSize: number,
	registrationHeight: number,
	ccuSaveLimit: number
}
```

## Parameters

| Param                   | Required? | Description                                                                    |
| ----------------------- | --------- | ------------------------------------------------------------------------------ |
| `receivingChainID`      | **Y**     | Chain ID of the receiving chain                                                |
| `receivingChainWsURL`   | **N**     | The WS url of a receiving node                                                 |
| `receivingChainIPCPath` | **N**     | The IPC path of a receiving node                                               |
| `ccuFrequency`          | **Y**     | Number of blocks after which a CCU should be created                           |
| `encryptedPrivateKey`   | **Y**     | Encrypted privateKey of the relayer                                            |
| `ccuFee`                | **Y**     | Fee to be paid for each CCU transaction                                        |
| `isSaveCCU`             | **Y**     | Flag for the user to either save or send a CCU on creation. Send is by default |
| `maxCCUSize`            | **Y**     | Maximum size of CCU to be allowed                                              |
| `registrationHeight`    | **Y**     | Height at the time of registration on the receiving chain                      |
| `ccuSaveLimit`          | **Y**     | Number of CCUs to save                                                         |

## Usage

Start your Lisk SDK with `--enable-chain-connector-plugin` flag, i.e.

```sh
    $ ./bin/run start --enable-chain-connector-plugin
```

## Documentation

[Setting up a relayer node](https://lisk.com/documentation/beta/run-blockchain/setup-relayer.html#installing-the-chain-connector-plugin): Details SDK Doc for setting up node with Chain Connector Plugin.

[LIP-53 # CCU Properties](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0053.md#cross-chain-update-transaction-properties): Explaination of CCU Properties from LIP-53.

[Interoperability Example](https://github.com/LiskHQ/lisk-sdk/tree/release/6.1.0/examples/interop): Example of Interoperability with 2 sidechains and 1 mainchain, Chain Connector Plugin enabled.

## License

Copyright 2016-2023 Lisk Foundation

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
[lisk documentation site]: https://lisk.com/documentation/lisk-sdk/v6/references/typedoc/modules/_liskhq_lisk_framework_chain_connector_plugin.html
