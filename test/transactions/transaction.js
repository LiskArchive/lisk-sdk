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
import createTransaction from '../../src/transactions/transaction';
import cryptoModule from '../../src/crypto';
import slots from '../../src/time/slots';

afterEach(() => sandbox.restore());

describe('transaction module', () => {
	describe('#createTransaction', () => {
		const fixedPoint = 10 ** 8;
		const recipientAddress = '58191285901858109L';
		const testData = 'data';
		const secret = 'secret';
		const secondSecret = 'second secret';
		const publicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
		const secondPublicKey = '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
		const emptyPublicKey = 'be907b4bac84fee5ce8811db2defc9bf0b2a2a2bbc3d54d8a2257ecd70441962';
		const testAmount = 1000;
		const sendFee = 0.1 * fixedPoint;
		const sendWithDataFee = 0.2 * fixedPoint;
		const timeWithOffset = 38350076;

		let getTimeWithOffsetStub;
		let transactionTransaction;

		beforeEach(() => {
			getTimeWithOffsetStub = sandbox.stub(slots, 'getTimeWithOffset').returns(timeWithOffset);
		});

		describe('without second secret', () => {
			describe('without data', () => {
				beforeEach(() => {
					transactionTransaction = createTransaction(
						recipientAddress, testAmount, secret,
					);
				});

				it('should create a transaction transaction', () => {
					(transactionTransaction).should.be.ok();
				});

				it('should use slots.getTimeWithOffset to calculate the timestamp', () => {
					(getTimeWithOffsetStub.calledWithExactly(undefined)).should.be.true();
				});

				it('should use slots.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
					const offset = -10;
					createTransaction(
						recipientAddress, testAmount, secret, null, null, offset,
					);

					(getTimeWithOffsetStub.calledWithExactly(offset)).should.be.true();
				});

				describe('returned transaction', () => {
					it('should be an object', () => {
						(transactionTransaction).should.be.type('object');
					});

					it('should have id string', () => {
						(transactionTransaction).should.have.property('id').and.be.type('string');
					});

					it('should have type number equal to 0', () => {
						(transactionTransaction).should.have.property('type').and.be.type('number').and.equal(0);
					});

					it('should have amount number equal to provided amount', () => {
						(transactionTransaction).should.have.property('amount').and.be.type('number').and.equal(testAmount);
					});

					it('should have fee number equal to send fee', () => {
						(transactionTransaction).should.have.property('fee').and.be.type('number').and.equal(sendFee);
					});

					it('should have recipientId string equal to provided recipient id', () => {
						(transactionTransaction).should.have.property('recipientId').and.be.type('string').and.equal(recipientAddress);
					});

					it('should have senderPublicKey hex string equal to sender public key', () => {
						(transactionTransaction).should.have.property('senderPublicKey')
							.and.be.hexString()
							.and.equal(publicKey);
					});

					it('should have timestamp number equal to result of slots.getTimeWithOffset', () => {
						(transactionTransaction).should.have.property('timestamp').and.be.type('number').and.equal(timeWithOffset);
					});

					it('should have signature hex string', () => {
						(transactionTransaction).should.have.property('signature').and.be.hexString();
					});

					it('should be signed correctly', () => {
						const result = cryptoModule.verifyTransaction(transactionTransaction);
						(result).should.be.ok();
					});

					it('should not be signed correctly if modified', () => {
						transactionTransaction.amount = 100;
						const result = cryptoModule.verifyTransaction(transactionTransaction);
						(result).should.be.not.ok();
					});

					it('should have an empty asset object', () => {
						(transactionTransaction).should.have.property('asset').and.be.type('object').and.be.empty();
					});
				});
			});

			describe('with data', () => {
				beforeEach(() => {
					transactionTransaction = createTransaction(
						recipientAddress, testAmount, secret, null, testData,
					);
				});

				it('should handle invalid (non-utf8 string) data', () => {
					(createTransaction.bind(null, recipientAddress, testAmount, secret, null, Buffer.from('hello')))
						.should.throw('Invalid encoding in transaction data. Data must be utf-8 encoded.');
				});

				it('should have fee number equal to send with data fee', () => {
					(transactionTransaction).should.have.property('fee').and.be.type('number').and.equal(sendWithDataFee);
				});

				describe('data asset', () => {
					it('should be a string equal to provided data', () => {
						(transactionTransaction.asset).should.have.property('data')
							.and.be.type('string')
							.and.equal(testData);
					});
				});
			});
		});

		describe('with second secret', () => {
			beforeEach(() => {
				transactionTransaction = createTransaction(
					recipientAddress, testAmount, secret, secondSecret,
				);
			});

			it('should create a transaction transaction', () => {
				const transactionTransactionWithoutSecondSecret = createTransaction(
					recipientAddress, testAmount, secret,
				);
				(transactionTransaction).should.be.ok();
				(transactionTransaction).should.not.be.equal(transactionTransactionWithoutSecondSecret);
			});

			it('should create transaction with second signature and data', () => {
				transactionTransaction = createTransaction(
					recipientAddress,
					testAmount,
					secret,
					secondSecret,
					testData,
				);
				(transactionTransaction).should.be.ok();
			});

			describe('returned transaction', () => {
				it('should have second signature hex string', () => {
					(transactionTransaction).should.have.property('signSignature').and.be.hexString();
				});

				it('should be second signed correctly', () => {
					const result = cryptoModule
						.verifyTransaction(transactionTransaction, secondPublicKey);
					(result).should.be.ok();
				});

				it('should be second signed correctly if second signature is an empty string', () => {
					transactionTransaction = createTransaction(
						recipientAddress,
						testAmount,
						secret,
						'',
						testData,
					);
					const result = cryptoModule
						.verifyTransaction(transactionTransaction, emptyPublicKey);
					(result).should.be.ok();
				});

				it('should not be second signed correctly if modified', () => {
					transactionTransaction.amount = 100;
					const result = cryptoModule
						.verifyTransaction(transactionTransaction, secondPublicKey);
					(result).should.not.be.ok();
				});
			});
		});
	});
});
