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
import { prepareTransaction } from '../../src/utils/prepare_transaction';
import { getTimeWithOffset } from '../../src/utils/time';
import { TransactionJSON } from '../../src/transaction_types';

describe('#prepareTransaction', () => {
	const passphrase = 'secret';
	const keys = {
		privateKey:
			'2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		publicKey:
			'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
	};
	const signature =
		'a00835fe0ad89d8b8a26cc3ffa8238d89bd38999f39d712fe8745707c8e18ea70337a7dfde725fddaa858dd64843170de3e481f54438b8aad734b0e75bbad706';
	const secondPassphrase = 'second secret';
	const secondSignature =
		'08ce78b2382c396596cc38ea8b9dbc2df62f0d919ddc817070902eeaf1b93ca17ced0766bb4e10f565ae9e55f673691d966dea45e60922fd2685556b441ffb0e';
	const id = '8330167589806376997';
	const defaultTransaction = {
		type: 0,
		amount: (10e8).toString(),
		timestamp: 10,
		senderPublicKey: keys.publicKey,
		asset: {},
		signatures: [],
	};
	let inputTransaction: Partial<TransactionJSON>;
	let preparedTransaction: TransactionJSON;

	beforeEach(() => {
		inputTransaction = { ...defaultTransaction };
		return Promise.resolve();
	});

	describe('without type', () => {
		it('should throw an error when it is not transaction', () => {
			const { type, ...invalidTransaction } = inputTransaction;
			return expect(
				prepareTransaction.bind(null, invalidTransaction, passphrase),
			).to.throw('Invalid transaction to process');
		});
	});

	describe('without signature', () => {
		beforeEach(() => {
			preparedTransaction = prepareTransaction(inputTransaction);
			return Promise.resolve();
		});

		it('should not mutate the original transaction', () => {
			return expect(inputTransaction).to.eql(defaultTransaction);
		});

		it('should not add a signature to a transaction', () => {
			return expect(preparedTransaction.signature).to.be.undefined;
		});

		it('should not add an id to a transaction', () => {
			return expect(preparedTransaction.id).to.be.undefined;
		});

		it('should add timestamp with the offset', () => {
			const { timestamp, ...transactionWithoutTimestamp } = inputTransaction;
			const currentTimestamp = getTimeWithOffset();
			preparedTransaction = prepareTransaction(
				transactionWithoutTimestamp,
				undefined,
				undefined,
				50,
			);
			return expect(preparedTransaction.timestamp).to.be.gt(currentTimestamp);
		});
	});

	describe('without second signature', () => {
		beforeEach(() => {
			preparedTransaction = prepareTransaction(inputTransaction, passphrase);
			return Promise.resolve();
		});

		it('should not mutate the original transaction', () => {
			return expect(inputTransaction).to.eql(defaultTransaction);
		});

		it('should add a signature to a transaction', () => {
			return expect(preparedTransaction)
				.to.have.property('signature')
				.and.be.hexString.and.equal(signature);
		});

		it('should add an id to a transaction', () => {
			return expect(preparedTransaction)
				.to.have.property('id')
				.and.match(/^[0-9]+$/)
				.and.equal(id);
		});
	});

	describe('with second signature', () => {
		beforeEach(() => {
			preparedTransaction = prepareTransaction(
				inputTransaction,
				passphrase,
				secondPassphrase,
			);
			return Promise.resolve();
		});

		it('should not mutate the original transaction', () => {
			return expect(inputTransaction).to.eql(defaultTransaction);
		});

		it('should add a second signature to a transaction if a second passphrase is provided', () => {
			return expect(preparedTransaction)
				.to.have.property('signSignature')
				.and.be.hexString.and.equal(secondSignature);
		});

		it('should not add a second signature to a type 1 transaction', () => {
			inputTransaction = Object.assign({}, defaultTransaction, {
				type: 1,
				asset: {
					signature: {
						publicKey: keys.publicKey,
					},
				},
			});
			preparedTransaction = prepareTransaction(
				inputTransaction,
				passphrase,
				secondPassphrase,
			);
			return expect(preparedTransaction).not.to.have.property('signSignature');
		});
	});
});
