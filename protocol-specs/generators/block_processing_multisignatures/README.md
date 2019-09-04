# Block Processing Test Generator

A set of fixture generators for Multi-signature registration

These generators makes use of an experimental library for combining transactions, include them into blocks and generate chain/account states.
The library can be found in the file utils/chain_state_builder.js with this library it's possible to build scenarios fairly quickly with a fluent interface.

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

Register Multi-signature Account:

```javascript
chainStateBuilder
	.registerMultisignature('2222471382442610527L')
	.addMemberAndSign('8465920867403822059L')
	.addMemberAndSign('1670991471799963578L')
	.finish()
	.forge();
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

chainStateBuilder
	.signTransaction(chainStateBuilder.lastTransactionId)
	.withAccount('8465920867403822059L');

chainStateBuilder
	.signTransaction(chainStateBuilder.lastTransactionId)
	.withAccount('1670991471799963578L');
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

Calling `forge()` generates a new block in the state so depending on how many times transfer and registerDelegate are called different combination of transactions will be included in a block.

## Resources

- [Spec link or LIP]()

## Comments

Further comments
