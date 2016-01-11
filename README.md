# Lisk JS

A client-side transactions library for [Lisk](https://lisk.io/). Allows transactions to be sent from within the browser, using a simple API.

## Installation

```
npm install lisk-js
```

## Tests

```
npm test
```

Tests written using mocha + schedule.js.

## Usage

Each function call has **secondSecret** parameter, this parameter is optional.

### Create transaction

Send 1000 LISK to 1859190791819301C

```js
var lisk = require('lisk-js');
var transaction = lisk.transaction.createTransaction("1859190791819301C", 1000, "secret", "secondSecret");
```

### Create second signature transaction

```js
var lisk = require('lisk-js');
var transaction = lisk.transaction.createTransaction("secret", "secondSecret");
```

### Create delegate transaction

```js
var lisk = require('lisk-js');
var transaction = lisk.transaction.createDelegate("secret", "username", "secondSecret");
```

### Create vote transaction


```js
var lisk = require('lisk-js');
var transaction = createVote("secret", ["+58199578191950019299181920120128129"], "secondSecret");
```

### Peers Communication

All transactions are sent to `/api/peer/transactions` using the `POST` method.

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

## Authors

- Boris Povod <boris@crypti.me>
- Olivier Beddows <olivier@lisk.io>

## License

MIT
