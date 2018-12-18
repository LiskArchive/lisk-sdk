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
import { checkTypes } from '../../../src/utils';
import { TransactionError } from '../../../src/errors';
import { addDate } from '../../helpers';
import { validTransaction } from '../../../fixtures';

describe('#checkTypes', () => {
	const defaultTransaction = addDate(validTransaction);

	it('should return a valid response with a valid transaction', () => {
		const { valid } = checkTypes(defaultTransaction);

		return expect(valid).to.be.true;
	});

	it('should return an invalid response with invalid `id` type', async () => {
		const invalidIdTransaction = {
			...defaultTransaction,
			id: 0,
		};
		const { valid, errors } = checkTypes(invalidIdTransaction);

		expect(valid).to.be.false;
		expect((errors as ReadonlyArray<TransactionError>)[0])
			.to.be.instanceof(TransactionError)
			.and.have.property('message', `'.id' should be string`);
	});

	it('should return an invalid response with invalid `amount` type', async () => {
		const invalidAmountTransaction = {
			...defaultTransaction,
			amount: 0,
		};
		const { valid, errors } = checkTypes(invalidAmountTransaction);

		expect(valid).to.be.false;
		expect((errors as ReadonlyArray<TransactionError>)[0])
			.to.be.instanceof(TransactionError)
			.and.have.property('message', `'.amount' should be string`);
	});

	it('should return an invalid response with invalid `fee` type', async () => {
		const invalidFeeTransaction = {
			...defaultTransaction,
			fee: 0,
		};
		const { valid, errors } = checkTypes(invalidFeeTransaction);

		expect(valid).to.be.false;
		expect((errors as ReadonlyArray<TransactionError>)[0])
			.to.be.instanceof(TransactionError)
			.and.have.property('message', `'.fee' should be string`);
	});

	it('should return an invalid response with invalid `type` type', async () => {
		const invalidTypeTransaction = {
			...defaultTransaction,
			type: '0',
		};
		const { valid, errors } = checkTypes(invalidTypeTransaction);

		expect(valid).to.be.false;
		expect((errors as ReadonlyArray<TransactionError>)[0])
			.to.be.instanceof(TransactionError)
			.and.have.property('message', `'.type' should be integer`);
	});

	it('should return an invalid response with invalid `timestamp` type', async () => {
		const invalidTimestampTransaction = {
			...defaultTransaction,
			timestamp: '12345',
		};
		const { valid, errors } = checkTypes(invalidTimestampTransaction);

		expect(valid).to.be.false;
		expect((errors as ReadonlyArray<TransactionError>)[0])
			.to.be.instanceof(TransactionError)
			.and.have.property('message', `'.timestamp' should be integer`);
	});

	it('should return an invalid response with invalid `senderId` type', async () => {
		const invalidTimestampTransaction = {
			...defaultTransaction,
			senderId: 12345,
		};
		const { valid, errors } = checkTypes(invalidTimestampTransaction);

		expect(valid).to.be.false;
		expect((errors as ReadonlyArray<TransactionError>)[0])
			.to.be.instanceof(TransactionError)
			.and.have.property('message', `'.senderId' should be string`);
	});

	it('should return an invalid response with invalid `senderPublicKey` type', async () => {
		const invalidsenderPublicKeyTransaction = {
			...defaultTransaction,
			senderPublicKey: 12345,
		};
		const { valid, errors } = checkTypes(invalidsenderPublicKeyTransaction);

		expect(valid).to.be.false;
		expect((errors as ReadonlyArray<TransactionError>)[0])
			.to.be.instanceof(TransactionError)
			.and.have.property('message', `'.senderPublicKey' should be string`);
	});

	it('should return an invalid response with invalid `senderSecondPublicKey` type', async () => {
		const invalidSenderSecondPublicKeyTransaction = {
			...defaultTransaction,
			senderSecondPublicKey: 12345,
		};
		const { valid, errors } = checkTypes(
			invalidSenderSecondPublicKeyTransaction,
		);

		expect(valid).to.be.false;
		expect((errors as ReadonlyArray<TransactionError>)[0])
			.to.be.instanceof(TransactionError)
			.and.have.property(
				'message',
				`'.senderSecondPublicKey' should be string`,
			);
	});

	it('should return an invalid response with invalid `recipientId` type', async () => {
		const invalidRecipientIdTransaction = {
			...defaultTransaction,
			recipientId: 12345,
		};
		const { valid, errors } = checkTypes(invalidRecipientIdTransaction);

		expect(valid).to.be.false;
		expect((errors as ReadonlyArray<TransactionError>)[0])
			.to.be.instanceof(TransactionError)
			.and.have.property('message', `'.recipientId' should be string`);
	});

	it('should return an invalid response with invalid `recipientPublicKey` type', async () => {
		const invalidRecipientPublicKeyTransaction = {
			...defaultTransaction,
			recipientPublicKey: 12345,
		};
		const { valid, errors } = checkTypes(invalidRecipientPublicKeyTransaction);

		expect(valid).to.be.false;
		expect((errors as ReadonlyArray<TransactionError>)[0])
			.to.be.instanceof(TransactionError)
			.and.have.property(
				'message',
				`'.recipientPublicKey' should be string,null`,
			);
	});

	it('should return an invalid response with invalid `signature` type', async () => {
		const invalidSignatureTransaction = {
			...defaultTransaction,
			signature: 12345,
		};
		const { valid, errors } = checkTypes(invalidSignatureTransaction);

		expect(valid).to.be.false;
		expect((errors as ReadonlyArray<TransactionError>)[0])
			.to.be.instanceof(TransactionError)
			.and.have.property('message', `'.signature' should be string`);
	});

	it('should return an invalid response with invalid `signSignature` type', async () => {
		const invalidSignSignatureTransaction = {
			...defaultTransaction,
			signSignature: 12345,
		};
		const { valid, errors } = checkTypes(invalidSignSignatureTransaction);

		expect(valid).to.be.false;
		expect((errors as ReadonlyArray<TransactionError>)[0])
			.to.be.instanceof(TransactionError)
			.and.have.property('message', `'.signSignature' should be string`);
	});

	it('should return an invalid response with invalid `signatures` type', async () => {
		const invalidSignaturesTransaction = {
			...defaultTransaction,
			signatures: {},
		};
		const { valid, errors } = checkTypes(invalidSignaturesTransaction);

		expect(valid).to.be.false;
		expect((errors as ReadonlyArray<TransactionError>)[0])
			.to.be.instanceof(TransactionError)
			.and.have.property('message', `'.signatures' should be array`);
	});

	it('should return an invalid response with invalid `asset` type', async () => {
		const invalidAssetTransaction = {
			...defaultTransaction,
			asset: [],
		};
		const { valid, errors } = checkTypes(invalidAssetTransaction);

		expect(valid).to.be.false;
		expect((errors as ReadonlyArray<TransactionError>)[0])
			.to.be.instanceof(TransactionError)
			.and.have.property('message', `'.asset' should be object`);
	});

	it('should return an invalid response with invalid `receivedAt` type', async () => {
		const invalidReceivedAtTransaction = {
			...defaultTransaction,
			receivedAt: '12345',
		};
		const { valid, errors } = checkTypes(invalidReceivedAtTransaction);

		expect(valid).to.be.false;
		expect((errors as ReadonlyArray<TransactionError>)[0])
			.to.be.instanceof(TransactionError)
			.and.have.property('message', `'.receivedAt' should be object`);
	});
});
