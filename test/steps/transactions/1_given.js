/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
import transactions from '../../../src/utils/transactions';

export function aSignatureInTableFormat() {
	this.test.ctx.signature = `
╔══════════════════════════════════════════════════════════════════╤══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╤═════════════════════╗
║ publicKey                                                        │ signature                                                                                                                        │ transactionId       ║
╟──────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────╢
║ d16198cd553243dae7d8e421107d9887e270eb1cc6e4c072adea0f0442b65ace │ 5e7de41c2b767358b7a27d28a454895f5c3c112cf914500d982a2d6fe7b90fdf71255f0e51608a7923bfbad311ac57b49a94f5039d0da98668e450bc412caa05 │ 2019337224576682092 ║
╚══════════════════════════════════════════════════════════════════╧══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╧═════════════════════╝
`.trim();
}

export function aSignatureInStringifiedJSONFormat() {
	this.test.ctx.signature = JSON.stringify({
		publicKey:
			'd16198cd553243dae7d8e421107d9887e270eb1cc6e4c072adea0f0442b65ace',
		signature:
			'5e7de41c2b767358b7a27d28a454895f5c3c112cf914500d982a2d6fe7b90fdf71255f0e51608a7923bfbad311ac57b49a94f5039d0da98668e450bc412caa05',
		transactionId: '2019337224576682092',
	});
}

export function aTransactionInTableFormat() {
	this.test.ctx.transaction = `
╔══════╤════════╤══════════╤═════════════╤═══════════╤══════════════════════════════════════════════════════════════════╤══════════════════════════════════════════════════════════════════╤══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╤═════════════════════╤════════════╗
║ type │ amount │ fee      │ recipientId │ timestamp │ senderPublicKey                                                  │ requesterPublicKey                                               │ signature                                                                                                                        │ id                  │ signatures ║
╟──────┼────────┼──────────┼─────────────┼───────────┼──────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┼────────────╢
║ 0    │ 100    │ 10000000 │ 123L        │ 49588116  │ 790049f919979d5ea42cca7b7aa0812cbae8f0db3ee39c1fe3cef18e25b67951 │ 790049f919979d5ea42cca7b7aa0812cbae8f0db3ee39c1fe3cef18e25b67951 │ 5f2c28f7f32f58ca810c297221869513f1fccde32f6e80a1924633cc8658a31c0a0744dc942352a7f01fea8f8c0cfe3683ab5774cbc810c95eba9ae657032807 │ 7265318842270028468 │            ║
╚══════╧════════╧══════════╧═════════════╧═══════════╧══════════════════════════════════════════════════════════════════╧══════════════════════════════════════════════════════════════════╧══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╧═════════════════════╧════════════╝
`.trim();
}

export function aTransactionInStringifiedJSONFormat() {
	this.test.ctx.transaction = JSON.stringify({
		type: 0,
		amount: '100',
		fee: 10000000,
		recipientId: '123L',
		timestamp: 49588014,
		asset: {},
		senderPublicKey:
			'790049f919979d5ea42cca7b7aa0812cbae8f0db3ee39c1fe3cef18e25b67951',
		requesterPublicKey:
			'790049f919979d5ea42cca7b7aa0812cbae8f0db3ee39c1fe3cef18e25b67951',
		signature:
			'3ff1d7a8644129958c3bfc8a71472f906709b9d78bb768521da5a5821603b0dc0505eb93d56d6980fcde0f6e10c486853e5531b1223ced4688f4a5e5e4846d00',
		id: '592277372048861237',
		signatures: [],
	});
}

export function aTransactionsObject() {
	this.test.ctx.transactionsObject = transactions;
}

export function aLiskObjectThatCanCreateTransactions() {
	const createdTransaction = {
		type: 0,
		amount: 123,
		publicKey: 'oneStubbedPublicKey',
	};

	[
		'transfer',
		'registerSecondPassphrase',
		'registerDelegate',
		'castVotes',
		'registerMultisignature',
	].forEach(methodName => {
		transactions[methodName].returns(createdTransaction);
	});

	this.test.ctx.createdTransaction = createdTransaction;
}
