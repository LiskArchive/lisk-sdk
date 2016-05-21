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
  fee: 100000000, // 0.1 LSK expressed as an integer value.
  id: "500224999259823996", // Transaction ID.
  recipientId: "1859190791819301L", // Recipient ID.
  senderPublicKey: "56e106a1d4a53dbe22cac52fefd8fc4123cfb4ee482f8f25a4fc72eb459b38a5", // Sender's public key.
  signSignature: "03fdd33bed30270b97e77ada44764cc8628f6ad3bbd84718571695262a5a18baa37bd76a62dd25bc21beacd61eaf2c63af0cf34edb0d191d225f4974cd3aa509", // Sender's second passphrase signature.
  signature: "9419ca3cf11ed2e3fa4c63bc9a4dc18b5001648e74522bc0f22bda46a188e462da4785e5c71a43cfc0486af08d447b9340ba8b93258c4c7f50798060fff2d709", // Transaction signature.
  timestamp: 27953413 // Based on UTC time of genesis since epoch.
}
```

### Network identification with Nethash

You need to obtain the nethash in order to be sure you are posting to the right network (testnet, mainnet or others). The nethash is simply the payload hash from the genesisBlock. If no nethash or wrong nethash is provided in the headers, the request will be rejected returning the expected nethash.

```json
{ "success": false, "message": "Request is made on the wrong network", "expected":"e2f8f69ec6ab4b12550a314bd867c46e64e429961bb427514a3a534c602ff467", "received":"wrong-nethash" }
```

The nethash for a given network can be obtained at the following API endpoint:

```
/api/blocks/getNetHash
```

You can also get the nethash from a peer this way:

On the client using [jQuery](https://jquery.com/):

```js
var nethash;
$.ajax({
  url: 'https://login.lisk.io/peer/transactions',
  data: JSON.stringify({}),
  dataType: 'json',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'os': 'linux3.2.0-4-amd64',
    'version': '0.3.0',
    'port': 1,
    'nethash': "wrong-nethash"
  },
  success: function(data) {
    nethash = data.body.expected;
  }
});
```

From a server using [Request](https://github.com/request/request):

```js
var nethash;
request({
  url: 'https://login.lisk.io/peer/transactions',
  json: { },
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'os': 'linux3.2.0-4-amd64',
    'version': '0.3.0',
    'port': 1,
    'nethash': "wrong-nethash"
  }
}, function(error, response, body) {
    nethash = body.expected;
  });
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

#### Sending transaction on the Client

Using [jQuery](https://jquery.com/):

```js
var success = function(data) {
  console.log(data);
};

$.ajax({
  url: 'https://login.lisk.io/peer/transactions',
  data: JSON.stringify({ transaction: transaction }),
  dataType: 'json',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'os': 'linux3.2.0-4-amd64',
    'version': '0.3.0',
    'port': 1,
    'nethash':nethash
  },
  success: success
});
```

#### Sending transaction on the Server

Using [Request](https://github.com/request/request):


```js
var request = require('request');

var callback = function(error, response, body) {
  console.log(error || body);
};

request({
  url: 'https://login.lisk.io/peer/transactions',
  json: { transaction: transaction },
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'os': 'linux3.2.0-4-amd64',
    'version': '0.3.0',
    'port': 1,
    'nethash': nethash
  }
}, callback);
```

#### Peer Response

Upon successfully accepting a transaction, the receiving node will respond with:

```json
{ "success": true, "result": "5318121831703437738" }
```

If the transaction is deemed invalid, or an error is encountered, the receiving node will respond with:

```json
{ "success": false, "message": "Error message" }
```

***

### Other transaction types

#### Creating a dapp transaction

```js
var options = {
  category: 0,
  name: "Lisk Guestbook",
  description: "The official Lisk guestbook",
  tags: "guestbook message sidechain",
  type: 0,
  link: "https://github.com/MaxKK/guestbookDapp/archive/master.zip",
  icon: "https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png"
};

var transaction = lisk.dapp.createDapp("secret", "secondSecret", options);
```

#### Creating a delegate transaction

```js
var transaction = lisk.delegate.createDelegate("secret", "username", "secondSecret");
```

#### Creating a second signature transaction

```js
var transaction = lisk.signature.createTransaction("secret", "secondSecret");
```

#### Creating a vote transaction

```js
var transaction = lisk.vote.createVote("secret", ["+58199578191950019299181920120128129"], "secondSecret");
```

***

## Authors

- Boris Povod <boris@crypti.me>
- Oliver Beddows <oliver@lisk.io>

## License

The MIT License (MIT)

Copyright (c) 2016 Lisk  
Copyright (c) 2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
