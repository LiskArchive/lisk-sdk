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
import cryptoModule from '../../src/crypto';

const time = require('../../src/transactions/utils/time');

afterEach(() => sandbox.restore());

describe('#send transaction', () => {
	const fixedPoint = 10 ** 8;
	const recipientId = '58191285901858109L';
	const testData = 'data';
	const secret = 'secret';
	const secondSecret = 'second secret';
	const publicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const secondPublicKey = '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const emptyPublicKey = 'be907b4bac84fee5ce8811db2defc9bf0b2a2a2bbc3d54d8a2257ecd70441962';
	const amount = 1000;
	const sendFee = 0.1 * fixedPoint;
	const sendWithDataFee = 0.2 * fixedPoint;
	const timeWithOffset = 38350076;

	let getTimeWithOffsetStub;
	let sendTransaction;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox.stub(time, 'getTimeWithOffset').returns(timeWithOffset);
	});

	describe('without second secret', () => {
		describe('without data', () => {
			beforeEach(() => {
				sendTransaction = send({
					recipientId, amount, secret,
				});
			});

			it('should create a send transaction', () => {
				(sendTransaction).should.be.ok();
			});

			it('should use time.getTimeWithOffset to calculate the timestamp', () => {
				(getTimeWithOffsetStub.calledWithExactly(undefined)).should.be.true();
			});

			it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
				const offset = -10;
				send({
					recipientId, amount, secret, timeOffset: offset,
				});

				(getTimeWithOffsetStub.calledWithExactly(offset)).should.be.true();
			});

			describe('returned send transaction', () => {
				it('should be an object', () => {
					(sendTransaction).should.be.type('object');
				});

				it('should have id string', () => {
					(sendTransaction).should.have.property('id').and.be.type('string');
				});

				it('should have type number equal to 0', () => {
					(sendTransaction).should.have.property('type').and.be.type('number').and.equal(0);
				});

				it('should have amount number equal to provided amount', () => {
					(sendTransaction).should.have.property('amount').and.be.type('number').and.equal(amount);
				});

				it('should have fee number equal to send fee', () => {
					(sendTransaction).should.have.property('fee').and.be.type('number').and.equal(sendFee);
				});

				it('should have recipientId string equal to provided recipient id', () => {
					(sendTransaction).should.have.property('recipientId').and.be.type('string').and.equal(recipientId);
				});

				it('should have senderPublicKey hex string equal to sender public key', () => {
					(sendTransaction).should.have.property('senderPublicKey')
						.and.be.hexString()
						.and.equal(publicKey);
				});

				it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
					(sendTransaction).should.have.property('timestamp').and.be.type('number').and.equal(timeWithOffset);
				});

				it('should have signature hex string', () => {
					(sendTransaction).should.have.property('signature').and.be.hexString();
				});

				it('should be signed correctly', () => {
					const result = cryptoModule.verifyTransaction(sendTransaction);
					(result).should.be.ok();
				});

				it('should not be signed correctly if modified', () => {
					sendTransaction.amount = 100;
					const result = cryptoModule.verifyTransaction(sendTransaction);
					(result).should.be.not.ok();
				});

				it('should have an empty asset object', () => {
					(sendTransaction).should.have.property('asset').and.be.type('object').and.be.empty();
				});
			});
		});

		describe('with data', () => {
			beforeEach(() => {
				sendTransaction = send({
					recipientId, amount, secret, data: testData,
				});
			});

			it('should handle invalid (non-utf8 string) data', () => {
				(send.bind(null, { recipientId, amount, secret, data: Buffer.from('hello') }))
					.should.throw('Invalid encoding in transaction data. Data must be utf-8 encoded.');
			});

			it('should have fee number equal to send with data fee', () => {
				(sendTransaction).should.have.property('fee').and.be.type('number').and.equal(sendWithDataFee);
			});

			describe('data asset', () => {
				it('should be a string equal to provided data', () => {
					(sendTransaction.asset).should.have.property('data')
						.and.be.type('string')
						.and.equal(testData);
				});
			});
		});
	});

	describe('with second secret', () => {
		beforeEach(() => {
			sendTransaction = send({
				recipientId, amount, secret, secondSecret,
			});
		});

		it('should create a send transaction', () => {
			const sendTransactionWithoutSecondSecret = send({
				recipientId, amount, secret,
			});
			(sendTransaction).should.be.ok();
			(sendTransaction).should.not.be.equal(sendTransactionWithoutSecondSecret);
		});

		it('should create send transaction with second signature and data', () => {
			sendTransaction = send({
				recipientId,
				amount,
				secret,
				secondSecret,
				data: testData,
			});
			(sendTransaction).should.be.ok();
		});

		describe('returned send transaction', () => {
			it('should have second signature hex string', () => {
				(sendTransaction).should.have.property('signSignature').and.be.hexString();
			});

			it('should be second signed correctly', () => {
				const result = cryptoModule
					.verifyTransaction(sendTransaction, secondPublicKey);
				(result).should.be.ok();
			});

			it('should be second signed correctly if second signature is an empty string', () => {
				sendTransaction = send({
					recipientId,
					amount,
					secret,
					secondSecret: '',
					testData,
				});
				const result = cryptoModule
					.verifyTransaction(sendTransaction, emptyPublicKey);
				(result).should.be.ok();
			});

			it('should not be second signed correctly if modified', () => {
				sendTransaction.amount = 100;
				const result = cryptoModule
					.verifyTransaction(sendTransaction, secondPublicKey);
				(result).should.not.be.ok();
			});
		});
	});
});
