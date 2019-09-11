# Description of utilities in this folder

This folder contains several helpers for helping in writting protocol-specs for the Lisk protocol.

### Chain State Builder

It's a library that abstracts transaction and block generation by usage of a fluent interface. It was constructed along with the writting of the basic generators for each transaction type so the code works but in the future we might want to improve it. All transactions types but `second signature` are implemented already and can be reused (check block generators for full usage examples)

Available methods:

- `transfer()`: creates a transfer transaction to be included in a block
- `registerDelegate()`: creates a delegate registration
- `castVotesFrom()`: creates vote transactions
- `registerMultisignature()`: creates multi signature registration transaction
- `signTransaction()`: sign a transaction from a multisignature account (needs to be called immediately after creating the transaction)
- `forge()`: creates a block including all the previously created transactions and it will update account balances and states based on the included transactions.
- `forgeInvalidInputBlock()`: it generates an input block that you know it should be invalid and avoids changing account states.

Important: this is not a full implementation of the protocol so this methods are only for speeding up creating scenarios but you still need to check if what you're building is valid or not based on the protocol.

Examples:

Transfer Lisk:

```javascript
chainStateBuilder
	.transfer('50')
	.from('16313739661670634666L')
	.to('10881167371402274308L')
	.forge();
```

Register Delegate:

```javascript
chainStateBuilder
	.registerDelegate('ADelegateName')
	.for('2222471382442610527L')
	.forge();
```

Cast Votes

```javascript
chainStateBuilder
	.castVotesFrom('2222471382442610527L')
	.voteDelegates([
		'eeeb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		'aaab0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	])
	.unvoteDelegates([
		'ooob0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9'
		'uuub0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	]);
```

Register Multi-signature Account:

```javascript
chainStateBuilder
	.registerMultisignature('2222471382442610527L')
	.addMemberAndSign('8465920867403822059L')
	.addMemberAndSign('1670991471799963578L')
	.finish()
	.forge(); // Calling forge is optional here as you might include non-conflicting transaction in the same block.
```

Sign transactions from a multisignature account:
(can be done ONLY immediately after creating the transaction to be signed)

```javascript
chainStateBuilder
	.registerMultisignature('2222471382442610527L')
	.addMemberAndSign('8465920867403822059L')
	.addMemberAndSign('1670991471799963578L')
	.finish()
	.forge();

chainStateBuilder
	.transfer('7')
	.from('2222471382442610527L')
	.to('10881167371402274308L');

// Attention! You need to sign the transactions inmmediatly after generating them
chainStateBuilder
	.signTransaction(chainStateBuilder.lastTransactionId)
	.withAccount('8465920867403822059L');

chainStateBuilder
	.signTransaction(chainStateBuilder.lastTransactionId)
	.withAccount('1670991471799963578L');
```

Forge invalid input block (for cases where the final block should not be included in the chain):

```javascript
chainStateBuilder
	.transfer('0.5')
	.from('2222471382442610527L')
	.to('10881167371402274308L')
	.transfer('0.5')
	.from('2222471382442610527L')
	.to('11325618463998518034L')
	.forgeInvalidInputBlock();
```

Calls can also be chained:

```javascript
chainStateBuilder
	.transfer('50')
	.from('16313739661670634666L')
	.to('10881167371402274308L')
	.transfer('20')
	.from('10881167371402274308L')
	.to('22313731441670634663L')
	.forge();
```

## Comments
