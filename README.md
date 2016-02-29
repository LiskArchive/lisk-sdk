# Lisk JS

Lisk JS is a JavaScript library for sending Lisk transactions. It's main benefit is that it does not require a locally installed Lisk node, and instead utilizes the existing peers on the network. It can be used from the client as a [browserify](http://browserify.org/) compiled module, or on the server as a standard Node.js module.

## Installation

```
npm install lisk-js
```

## Tests

```
npm test
```

Tests written using mocha + schedule.js.

***

## Usage

On the client:

```html
<script src="node_modules/lisk-js/app.js"></script>
```

On the server:

```js
var lisk = require('lisk-js');
```

### Generating a key pair

To generate a public / private key pair from a given passphrase:

```js
var keys = lisk.crypto.getKeys("passphrase");
```

Returning:

```js
{
  publicKey: "5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09",
  privateKey: "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a2…44491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09"
}
```

### Generating an address

To generate a unique Lisk address from a given public key:

```js
var address = lisk.crypto.getAddress("5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09");
```

Returning:

```
18160565574430594874L
```

### Creating a transaction

To create a signed transaction object, which can then be posted onto the network:

```js
var amount      = 1000 * Math.pow(10, 8); // 100000000000
var transaction = lisk.transaction.createTransaction("1859190791819301L", amount, "passphrase", "secondPassphrase");
```

Returning:

```js
{
  type: 0, // Transaction type. 0 = Normal transaction.
  amount: 100000000000, // The amount to send expressed as an integer value.
  asset: {}, // Transaction asset, dependent on tx type.
  fee: 100000000, // 0.1 LISK expressed as an integer value.
  id: "500224999259823996", // Transaction ID.
  recipientId: "1859190791819301L", // Recipient ID.
  senderPublicKey: "56e106a1d4a53dbe22cac52fefd8fc4123cfb4ee482f8f25a4fc72eb459b38a5", // Sender's public key.
  signSignature: "03fdd33bed30270b97e77ada44764cc8628f6ad3bbd84718571695262a5a18baa37bd76a62dd25bc21beacd61eaf2c63af0cf34edb0d191d225f4974cd3aa509", // Sender's second passphrase signature.
  signature: "9419ca3cf11ed2e3fa4c63bc9a4dc18b5001648e74522bc0f22bda46a188e462da4785e5c71a43cfc0486af08d447b9340ba8b93258c4c7f50798060fff2d709", // Transaction signature.
  timestamp: 27953413 // Based on UTC time of genesis since epoch.
}
```

### Posting a transaction

Transaction objects are sent to `/peer/transactions`, using the `POST` method.

Example:

```js
Method: POST
Content-Type: application/json

{
    "transaction" : {
        ...
    }
}
```

#### On the Client

Using [jQuery](https://jquery.com/):

```js
$.post({
  url: 'https://login.lisk.io/peer/transactions',
  data: { transaction: transactionObject },
  headers: {
    'Content-Type': 'application/json',
    'os': 'linux3.2.0-4-amd64',
    'version': '0.1.1',
    'port': 1,
    'share-port': 0
  }
});
```

#### On the Server

Using [Request](https://github.com/request/request):

```js
var request = require('request');

request({
  url: 'https://login.lisk.io/peer/transactions',
  form: { transaction: transactionObject },
  headers: {
    'Content-Type': 'application/json',
    'os': 'linux3.2.0-4-amd64',
    'version': '0.1.1',
    'port': 1,
    'share-port': 0
  }
});
```

#### Peer Response

Upon successfully accepting a transaction, the receiving node will respond with:

```json
{ "success": true }
```

If the transaction is deemed invalid, or an error is encountered, the receiving node will respond with:

```json
{ "success": false, "error": "Error message" }
```

***

### Other transaction types

#### Creating a second signature transaction

```js
var transaction = lisk.transaction.createTransaction("secret", "secondSecret");
```

#### Creating a delegate transaction

```js
var transaction = lisk.transaction.createDelegate("secret", "username", "secondSecret");
```

#### Creating a vote transaction

```js
var transaction = lisk.transaction.createVote("secret", ["+58199578191950019299181920120128129"], "secondSecret");
```

***

## Authors

- Boris Povod <boris@crypti.me>
- Olivier Beddows <olivier@lisk.io>

## License

The MIT License (MIT)

Copyright (c) 2016 Lisk  
Copyright (c) 2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
