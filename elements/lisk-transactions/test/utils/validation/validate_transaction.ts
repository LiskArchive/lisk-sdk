/*
 * Copyright © 2019 Lisk Foundation
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
import { expect } from 'chai';
import * as fixtures from '../../../fixtures/transactions.json';
import * as invalidFixtures from '../../../fixtures/invalid_transactions.json';
import { validateTransaction } from '../../../src/utils/validation/validate_transaction';
import { TransactionJSON } from '../../../src/transaction_types';
import { ErrorObject } from 'ajv';

describe('validateTransaction', () => {
	describe('#validateTransaction', () => {
		describe('when fixtures provided', () => {
			it('should be all valid for the fixtures', () => {
				return fixtures.forEach((tx: unknown) => {
					const { valid, errors } = validateTransaction(tx as TransactionJSON);
					expect(valid).to.be.true;
					expect(errors).to.be.undefined;
				});
			});
		});

		describe('when transaction does not contain type', () => {
			const invalidTransaction = {
				amount: '0',
				fee: '10000000',
				recipientId: 'recipientID',
				senderPublicKey:
					'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
				timestamp: 54196078,
				asset: {},
				signature:
					'4c8a3bfaacfab18a7ef34ce8d7176ea2701dfd7221a1c95ecbc1cce778bbccdb7cbbe1a87b3e9e47330f1cae6665c4a44666e132aa324de9a5ab9b6a1e2b1d0c',
				id: '18066659039293493823',
			};
			it('should throw an error', () => {
				return expect(
					validateTransaction.bind(null, invalidTransaction as TransactionJSON),
				).to.throw(Error, 'Transaction type is required.');
			});
		});

		describe('when invalid fixtures provided', () => {
			it('should be all invalid for the invalid fixtures (except type 6 and 7)', () => {
				return invalidFixtures
					.filter((tx: any) => tx.type !== 6 && tx.type !== 7)
					.forEach((tx: any) => {
						const { valid, errors } = validateTransaction(tx);
						expect(valid).to.be.false;
						expect(errors).not.to.be.undefined;
					});
			});

			it('should throw an unsupported transaction type error for type 6 and 7', () => {
				return invalidFixtures
					.filter((tx: any) => tx.type === 6 || tx.type === 7)
					.forEach((tx: any) => {
						expect(validateTransaction.bind(null, tx)).to.throw(
							Error,
							'Unsupported transaction type.',
						);
					});
			});
		});

		describe('when the transaction contains invalid data in merged schema', () => {
			const invalidTransaction = {
				type: 0,
				amount: '0',
				fee: '10000000',
				recipientId: 'recipientID',
				senderPublicKey:
					'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
				timestamp: 54196078,
				asset: {},
				signature:
					'4c8a3bfaacfab18a7ef34ce8d7176ea2701dfd7221a1c95ecbc1cce778bbccdb7cbbe1a87b3e9e47330f1cae6665c4a44666e132aa324de9a5ab9b6a1e2b1d0c',
				id: '18066659039293493823',
			};

			it('should not include $merge error when the merged schema has error', () => {
				const { valid, errors } = validateTransaction(
					invalidTransaction as TransactionJSON,
				);
				expect(valid).to.be.false;
				expect(errors).not.to.be.undefined;
				const errorsArray = errors as ReadonlyArray<ErrorObject>;
				expect(errorsArray[0].dataPath).to.equal('.amount');
				expect(errorsArray[1].dataPath).to.equal('.recipientId');
				return expect(errors).to.have.length(2);
			});
		});
	});

	describe('#getTransactionSchemaValidator', () => {
		const type6Tx = {
			type: 6,
			amount: '166413',
			fee: '10000000',
			recipientId: '',
			senderPublicKey:
				'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
			timestamp: 54196078,
			asset: { inTransfer: { dappId: '1000000' } },
			signature:
				'f2b1a66d9bd8ae0c1b3404fe397a11bd696e5aea274e6a8d9fea2f976503d006b8ca65484daf2498f854a0c0109b924b653a8d6ba31a568cb70727b7d3472902',
			id: '9501694969515165251',
		};

		const type7Tx = {
			type: 7,
			amount: '835151',
			fee: '10000000',
			recipientId: '1859190791819301L',
			senderPublicKey:
				'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
			timestamp: 54196079,
			asset: {
				outTransfer: { dappId: '614143983', transactionId: '749591467' },
			},
			signature:
				'646cd6be9f385bfa4f914b66a675a77080a3c1093278cfbca16d3d7fbf768350c9a7e270a8e5a72347e2792d3cfc770f3a3bb9ea542c300cba3976f34bd040e',
		};

		it('should throw an error when type 6 transaction is provided', () => {
			return expect(
				validateTransaction.bind(null, type6Tx as TransactionJSON),
			).to.throw(Error, 'Unsupported transaction type.');
		});

		it('should throw an error when type 7 transaction is provided', () => {
			return expect(
				validateTransaction.bind(null, type7Tx as TransactionJSON),
			).to.throw(Error, 'Unsupported transaction type.');
		});
	});

	describe('#validateMultiTransaction', () => {
		const invalidMultiTransaction = {
			type: 4,
			amount: '0',
			fee: '3000000000',
			recipientId: '',
			senderPublicKey:
				'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
			timestamp: 54196078,
			asset: {
				multisignature: {
					min: 6,
					lifetime: 1,
					keysgroup: [
						'+e64df51060a2ce43f91b24ae75cc83f1866f9fead2ca2420cf3df153e6368a97',
						'+4ef26ed51f4b82134b16f25a2556bed98a0b3963a17c0d2f0fa87f67cc6f29fe',
						'+818d34925549e0aea67f1b82190c3e288b1c66de95ce699c2f5c87f1e622012c',
						'+a2eece2bf0ee74e492939ac84723646270bfefab84914a5cf68baffd9bb84858',
						'+46f3ec44dbcffe28c6bcd4eb494ce24ceea51677eb67005bdd4dd3202db55251',
					],
				},
			},
			signature:
				'4c8a3bfaacfab18a7ef34ce8d7176ea2701dfd7221a1c95ecbc1cce778bbccdb7cbbe1a87b3e9e47330f1cae6665c4a44666e132aa324de9a5ab9b6a1e2b1d0c',
			id: '18066659039293493823',
		};

		it('should be invalid when min is greater than the keysgroup', () => {
			const { valid, errors } = validateTransaction(
				invalidMultiTransaction as any,
			);
			expect(valid).to.be.false;
			expect(errors).not.to.be.undefined;
			const errorsArray = errors as ReadonlyArray<ErrorObject>;
			expect(errorsArray[0].dataPath).to.equal('.asset.multisignature.min');
			return expect(errorsArray[0].message).to.equal(
				'.asset.multisignature.min cannot be greater than .asset.multisignature.keysgroup.length',
			);
		});
	});
});
