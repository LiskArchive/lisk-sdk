/*
 * Copyright © 2018 Lisk Foundation
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
import { TransactionError } from '../../../src/errors';
import { TransactionJSON } from '../../../src/transaction_types';
import { verifyMultisignatures } from '../../../src/transactions/helpers';

describe('#verifyMultisignatures', () => {
	const defaultMemberPublicKeys = [
		'c44a88e68196e4d2f608873467c7350fb92b954eb7c3b31a989b1afd8d55ebdb',
		'2eca11a4786f35f367299e1defd6a22ac4eb25d2552325d6c5126583a3bdd0fb',
		'a17e03f21bfa187d2a30fe389aa78431c587bf850e9fa851b3841274fc9f100f',
		'758fc45791faf5796e8201e49950a9ee1ee788192714b935be982f315b1af8cd',
		'9af12d260cf5fcc49bf8e8fce2880b34268c7a4ac8915e549c07429a01f2e4a5',
	];

	const defaultTransaction = {
		id: '15181013796707110990',
		type: 0,
		timestamp: 77612766,
		senderPublicKey:
			'24193236b7cbeaf5e6feafbbf7a791095ea64ec73abde8f0470001fee5d39d9d',
		senderId: '4368107197830030479L',
		recipientId: '4368107197830030479L',
		recipientPublicKey:
			'24193236b7cbeaf5e6feafbbf7a791095ea64ec73abde8f0470001fee5d39d9d',
		amount: '100000000',
		fee: '10000000',
		signature:
			'dc8fe25f817c81572585b3769f3c6df13d3dc93ff470b2abe807f43a3359ed94e9406d2539013971431f2d540e42dc7d3d71c7442da28572c827d59adc5dfa08',
		signatures: [
			'2df1fae6865ec72783dcb5f87a7d906fe20b71e66ad9613c01a89505ebd77279e67efa2c10b5ad880abd09efd27ea350dd8a094f44efa3b4b2c8785fbe0f7e00',
			'2ec5bbc4ff552f991262867cd8f1c30a417e4596e8343d882b7c4fc86288b9e53592031f3de75ffe8cf4d431a7291b76c758999bb52f46a4da62a27c8901b60a',
			'36d5c7da5f54007e22609105570fad04597f4f2b00d46baba603c213eaed8de55e9f3e5d0f39789dbc396330b2d9d4da46b7d67187075e86220bc0341c3f7802',
		],
		asset: {
			data: 'the real test',
		},
		receivedAt: new Date(),
	};

	describe('given valid multisignatures', () => {
		beforeEach(() => {
			return Promise.resolve();
		});

		it('should return an object with verfied = true', () => {
			const { verified } = verifyMultisignatures(
				defaultMemberPublicKeys,
				3,
				defaultTransaction,
			);
			return expect(verified).to.be.true;
		});

		describe('when not enough valid signatures', () => {
			it('should return a verification fail response', () => {
				const invalidTransaction = {
					...defaultTransaction,
					signatures: defaultTransaction.signatures.slice(0, 1),
				};
				const { verified, errors } = verifyMultisignatures(
					defaultMemberPublicKeys,
					3,
					invalidTransaction,
				);

				const errorsArray = errors as ReadonlyArray<TransactionError>;

				expect(errors).to.be.an('array');
				errorsArray.forEach(error =>
					expect(error).to.be.instanceof(TransactionError),
				);
				return expect(verified).to.be.false;
			});
		});
	});

	describe('given an invalid multisignatures', () => {
		let invalidTransaction: TransactionJSON;
		beforeEach(() => {
			invalidTransaction = {
				...defaultTransaction,
				signatures: defaultTransaction.signatures.map(signature =>
					signature.replace('1', '0'),
				),
			};
			return Promise.resolve();
		});

		it('should return a verification fail response', () => {
			const { verified, errors } = verifyMultisignatures(
				defaultMemberPublicKeys,
				3,
				invalidTransaction as TransactionJSON,
			);
			const errorsArray = errors as ReadonlyArray<TransactionError>;

			expect(errors).to.be.an('array');
			errorsArray.forEach(error =>
				expect(error).to.be.instanceof(TransactionError),
			);
			return expect(verified).to.be.false;
		});
	});
});
