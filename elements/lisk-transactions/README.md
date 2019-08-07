# @liskhq/lisk-transactions

@liskhq/lisk-transactions is containing everything related to transactions according to the Lisk protocol

## Introduction

Transactions are the essential part of the blockchain applications created using Lisk SDK.

The Lisk SDK provides a class [BaseTransaction](https://github.com/LiskHQ/lisk-sdk/blob/development/elements/lisk-transactions/src/base_transaction.ts) from which developers can inherit and extend from, to create **custom transaction types**.```
The application-specific business logic for custom transaction types is defined according to an abstract [interface](#interface) that is common across all transaction types.

All of the default transaction types of the Lisk SDK transactions implement the abstract interface of the base transaction, and therefore can be used as a role model for custom transactions.
It's also possible to inherit from one of the default transaction types, in order to extent or modify them.

The default transaction types each implement a different use-case of the Lisk network, i.e:

1. Balance transfer (type 0)
2. Second signature registration (type 1)
3. Delegate registration (type 2)
4. Delegate vote (type 3)
5. Multisignature account registration (type 4)

> The first 10 transaction types are reserved for the [Lisk protocol](https://lisk.io/documentation/lisk-protocol), don't use them to register custom transactions.

For a complete list of all default transaction types, check out the section [Lisk Transactions](https://lisk.io/documentation/lisk-protocol/transactions) of the Lisk Protocol.

Check out the Lisk SDK [Example Apps](https://github.com/LiskHQ/lisk-sdk-test-app) for simple [code examples of custom transaction types](https://github.com/LiskHQ/lisk-sdk-test-app/blob/development/hello_world/hello_transaction.js).

### Lifecycle

The lifecycle of a transaction in Lisk SDK can be summarized as follows:

1. A transaction is created and signed (off-chain). The script to do it is in `src/create_and_sign.ts`.
2. The transaction is sent to a network. This can be done by a third party tool (like `curl` or `Postman`), but also using Lisk Commander (`lisk transaction:broadcast`).
   To send the default transactions for the protocol network, you can rely on the wallet Lisk UI tools - Lisk Hub and Mobile. All of the tools need to be authorized to access an HTTP API of a network node.
3. A network node receives a transaction and after a lightweight schema validation, adds it to a transaction pool.
4. In the transaction pool, the transactions are firstly `validated`. In this step, only static checks are performed. These include schema validation and signature validation.
5. `prepare` function implemented in the transaction definition is then executed for validated transactions, which loads blockchain data necessary for verifying and executing the transaction. This data is cached in memory. It is called state store which has the interface defined here: <should have a some details about the state store>
6. After prepare function, transactions are executed in memory by performing `apply` and `applyAsset` functions. These functions verify the transactions against the blockchain data and perform the effect of the transaction on the blockchain state in memory.
   6a. Based on workflow executing `apply` and `applyAsset` functions, the state in memory is either saved to the blockchain or discarded. For instance, if the transaction is being executed within the process of saving new a block in the blockchain, the changes in the memory are saved in the database. In the other case, when the transaction is executed within the domain of the transaction pool, the changes of state in memory are discarded.
7. It is probable, especially shortly after a block is applied, that due to the decentralized network conditions a node does the `undo` step and the block containing all of the included transactions get reverted in favour of a competing block.

While implementing a custom transaction, it is necessary to implement some of the mentioned steps. For most of them, a base transaction implements a default behaviour. As you feel more confident in using Lisk SDK, it is more likely for developers to override most of the base transaction methods, so the implementation is well-tailored and implemented with the best possible performance to the application's use case.

### Interface

Over the course of the alpha phase there will be significant changes in the Lisk protocol and implementation. We will be working towards the great developer experience while using Alpha SDK by reducing and optimizing the set of functions in custom transaction's API in the following releases. We strongly rely on the community feedback of how the interfaces can be improved.

#### Required methods

All of the abstract methods and properties on the base transaction's interface are required to implement. Those are:

##### TYPE

> static TYPE: number

The hallmark of a transaction. Override this static parameter with any number, keeping in mind that the first 10 types (0-9) are reserved for the default transactions.

##### prepare

> prepare(store: StateStorePrepare): Promise<void>

Prepare the relevant information about the accounts, which will be accessible in the later steps during the `apply` and `undo` steps.

##### validateAsset

> validateAsset(): ReadonlyArray<TransactionError>

Before a transaction reaches the apply step it gets validated. Check the transaction's asset correctness from the schema perspective (no access to StateStore here).
Invalidate the transaction by pushing an error into the result array.

##### applyAsset

> applyAsset(store: StateStore): ReadonlyArray<TransactionError>

The business use-case of a transaction is implemented in `applyAsset` method. Apply all of the necessary changes from the received transaction to the affected account(s) by calling `store.set`. Call `store.get` to get all of the relevant data. The transaction that you're currently processing is the function's context (like `this.amount`).
Invalidate the transaction by pushing an error into the result array.

##### undoAsset

> undoAsset(store: StateStore): ReadonlyArray<TransactionError>

The invert of `applyAsset`. Roll-back all of the changes to the accounts done in the `applyAsset` step.

#### Additional methods

To increase your application's performance, you should override the following functions: `verifyAgainstTransactions`, `assetFromSync`, `fromSync`.

The BaseTransaction provides the default implementation of the methods revolving around the signatures. As your application matures you can provide the custom ways of how your a transaction's signature is derived: `sign`, `getBytes`, `assetToBytes`.

You can find the complete documentation of the BaseTransaction API, as well as all of the default transactions extending it
on the auto-generated documentation hosted on [liskhq.github.io/lisk-sdk](https://liskhq.github.io/lisk-sdk/). With the next releases, we will be enriching the BaseTransaction's methods descriptions.

## Installation

```sh
$ npm install --save @liskhq/lisk-transactions
```

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

---

Copyright © 2016-2019 Lisk Foundation

Copyright © 2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[lisk core github]: https://github.com/LiskHQ/lisk
[lisk documentation site]: https://lisk.io/documentation/lisk-elements
