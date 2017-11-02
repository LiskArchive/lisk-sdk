/*
 * Copyright © 2017 Lisk Foundation
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
import send from '../../src/transactions/0_send';

const time = require('../../src/transactions/utils/time');

describe('#send transaction', () => {
	const fixedPoint = 10 ** 8;
	const recipientId = '58191285901858109L';
	const testData = 'data';
	const secret = 'secret';
	const secondSecret = 'second secret';
	const publicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const amount = '1000';
	const sendFee = (0.1 * fixedPoint).toString();
	const sendWithDataFee = (0.2 * fixedPoint).toString();
	const timeWithOffset = 38350076;

	let getTimeWithOffsetStub;
	let sendTransaction;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox
			.stub(time, 'getTimeWithOffset')
			.returns(timeWithOffset);
	});

	describe('with first secret', () => {
		describe('without data', () => {
			beforeEach(() => {
				sendTransaction = send({
					recipientId,
					amount,
					secret,
				});
			});

			it('should create a send transaction', () => {
				sendTransaction.should.be.ok();
			});

			it('should use time.getTimeWithOffset to calculate the timestamp', () => {
				getTimeWithOffsetStub.should.be.calledWithExactly(undefined);
			});

			it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
				const offset = -10;
				send({
					recipientId,
					amount,
					secret,
					timeOffset: offset,
				});

				getTimeWithOffsetStub.should.be.calledWithExactly(offset);
			});

			it('should be an object', () => {
				sendTransaction.should.be.type('object');
			});

			it('should have id string', () => {
				sendTransaction.should.have.property('id').and.be.type('string');
			});

			it('should have type number equal to 0', () => {
				sendTransaction.should.have
					.property('type')
					.and.be.type('number')
					.and.equal(0);
			});

			it('should have amount string equal to provided amount', () => {
				sendTransaction.should.have
					.property('amount')
					.and.be.type('string')
					.and.equal(amount);
			});

			it('should have fee string equal to send fee', () => {
				sendTransaction.should.have
					.property('fee')
					.and.be.type('string')
					.and.equal(sendFee);
			});

			it('should have recipientId string equal to provided recipient id', () => {
				sendTransaction.should.have
					.property('recipientId')
					.and.be.type('string')
					.and.equal(recipientId);
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				sendTransaction.should.have
					.property('senderPublicKey')
					.and.be.hexString()
					.and.equal(publicKey);
			});

			it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
				sendTransaction.should.have
					.property('timestamp')
					.and.be.type('number')
					.and.equal(timeWithOffset);
			});

			it('should have signature hex string', () => {
				sendTransaction.should.have.property('signature').and.be.hexString();
			});

			it('should have an empty asset object', () => {
				sendTransaction.should.have
					.property('asset')
					.and.be.type('object')
					.and.be.empty();
			});

			it('should not have the second signature property', () => {
				sendTransaction.should.not.have.property('signSignature');
			});
		});

		describe('with data', () => {
			beforeEach(() => {
				sendTransaction = send({
					recipientId,
					amount,
					secret,
					data: testData,
				});
			});

			it('should handle invalid (non-utf8 string) data', () => {
				send
					.bind(null, {
						recipientId,
						amount,
						secret,
						data: Buffer.from('hello'),
					})
					.should.throw(
						'Invalid encoding in transaction data. Data must be utf-8 encoded.',
					);
			});

			it('should have fee string equal to send with data fee', () => {
				sendTransaction.should.have
					.property('fee')
					.and.be.type('string')
					.and.equal(sendWithDataFee);
			});

			describe('data asset', () => {
				it('should be a string equal to provided data', () => {
					sendTransaction.asset.should.have
						.property('data')
						.and.be.type('string')
						.and.equal(testData);
				});
			});
		});
	});

	describe('with first and second secret', () => {
		beforeEach(() => {
			sendTransaction = send({
				recipientId,
				amount,
				secret,
				secondSecret,
			});
		});

		it('should create a send transaction with data property', () => {
			sendTransaction = send({
				recipientId,
				amount,
				secret,
				secondSecret,
				data: testData,
			});

			sendTransaction.asset.should.have.property('data');
		});

		it('should have the second signature property as hex string', () => {
			sendTransaction.should.have.property('signSignature').and.be.hexString();
		});
	});
});
