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
import transfer from '../../src/transactions/transfer';
import cryptoModule from '../../src/crypto';
import slots from '../../src/time/slots';

describe('transfer module', () => {
	const dappId = '1234213';
	const secret = 'secret';
	const secondSecret = 'secondSecret';
	const publicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const secondPublicKey = '8b509500d5950122b3e446189b4312805515c8e7814a409e09ac5c21935564af';
	const amount = 10e8;
	const sendFee = 0.1e8;
	const timeWithOffset = 38350076;
	const offset = -10;

	let getTimeWithOffsetStub;

	beforeEach(() => {
		getTimeWithOffsetStub = sinon.stub(slots, 'getTimeWithOffset').returns(timeWithOffset);
	});

	afterEach(() => {
		getTimeWithOffsetStub.restore();
	});

	describe('exports', () => {
		it('should be an object', () => {
			(transfer).should.be.type('object');
		});

		it('should export createInTransfer function', () => {
			(transfer).should.have.property('createInTransfer').be.type('function');
		});

		it('should export createOutTransfer function', () => {
			(transfer).should.have.property('createOutTransfer').be.type('function');
		});
	});

	describe('#createInTransfer', () => {
		const { createInTransfer } = transfer;

		let inTransferTransaction;

		describe('without second secret', () => {
			beforeEach(() => {
				inTransferTransaction = createInTransfer(dappId, amount, secret);
			});

			it('should create an in transfer dapp transaction', () => {
				(inTransferTransaction).should.be.ok();
			});

			it('should use time slots to get the time for the timestamp', () => {
				(getTimeWithOffsetStub.calledWithExactly(undefined)).should.be.true();
			});

			it('should use time slots with an offset of -10 seconds to get the time for the timestamp', () => {
				createInTransfer(dappId, amount, secret, null, offset);

				(getTimeWithOffsetStub.calledWithExactly(offset)).should.be.true();
			});

			describe('returned in transfer transaction object', () => {
				it('should be an object', () => {
					(inTransferTransaction).should.be.type('object');
				});

				it('should have type number equal to 6', () => {
					(inTransferTransaction).should.have.property('type').and.be.type('number').and.equal(6);
				});

				it('should have amount number equal to 10 LSK', () => {
					(inTransferTransaction).should.have.property('amount').and.be.type('number').and.equal(amount);
				});

				it('should have fee number equal to 0.1 LSK', () => {
					(inTransferTransaction).should.have.property('fee').and.be.type('number').and.equal(sendFee);
				});

				it('should have recipientId equal to null', () => {
					(inTransferTransaction).should.have.property('recipientId').be.null();
				});

				it('should have senderPublicKey hex string equal to sender public key', () => {
					(inTransferTransaction).should.have.property('senderPublicKey').and.be.hexString().and.equal(publicKey);
				});

				it('should have timestamp number equal to result of slots.getTimeWithOffset', () => {
					(inTransferTransaction).should.have.property('timestamp').and.be.type('number').and.equal(timeWithOffset);
				});

				it('should have signature hex string', () => {
					(inTransferTransaction).should.have.property('signature').and.be.hexString();
				});

				it('should be signed correctly', () => {
					const result = cryptoModule.verify(inTransferTransaction);
					(result).should.be.ok();
				});

				it('should not be signed correctly if modified', () => {
					inTransferTransaction.amount = 100;
					const result = cryptoModule.verify(inTransferTransaction);
					(result).should.be.not.ok();
				});

				it('should have an asset object', () => {
					(inTransferTransaction).should.have.property('asset').and.be.type('object');
				});

				describe('asset', () => {
					it('should have the in transfer dapp id', () => {
						(inTransferTransaction.asset)
							.should.have.property('inTransfer')
							.with.property('dappId')
							.and.be.equal(dappId);
					});
				});
			});
		});

		describe('with second secret', () => {
			beforeEach(() => {
				inTransferTransaction = createInTransfer(dappId, amount, secret, secondSecret);
			});

			it('should create an in transfer dapp transaction with a second secret', () => {
				const inTransferTransactionWithoutSecondSecret = createInTransfer(dappId, amount, secret);
				(inTransferTransaction).should.be.ok();
				(inTransferTransaction).should.not.be.equal(inTransferTransactionWithoutSecondSecret);
			});

			describe('returned in transfer transaction', () => {
				it('should have second signature hex string', () => {
					(inTransferTransaction).should.have.property('signSignature').and.be.hexString();
				});

				it('should be second signed correctly', () => {
					const result = cryptoModule.verifySecondSignature(inTransferTransaction, secondPublicKey);
					(result).should.be.ok();
				});

				it('should not be second signed correctly if modified', () => {
					inTransferTransaction.amount = 100;
					const result = cryptoModule.verifySecondSignature(inTransferTransaction, secondPublicKey);
					(result).should.not.be.ok();
				});
			});
		});
	});

	describe('#createOutTransfer', () => {
		const { createOutTransfer } = transfer;
		const transactionId = '9876567';
		const recipientId = '989234L';

		let outTransferTransaction;

		describe('without second secret', () => {
			beforeEach(() => {
				outTransferTransaction = createOutTransfer(
					dappId, transactionId, recipientId, amount, secret,
				);
			});

			it('should create an out transfer dapp transaction', () => {
				(outTransferTransaction).should.be.ok();
			});

			it('should use time slots to get the time for the timestamp', () => {
				(getTimeWithOffsetStub.calledWithExactly(undefined)).should.be.true();
			});

			it('should use time slots with an offset of -10 seconds to get the time for the timestamp', () => {
				createOutTransfer(dappId, transactionId, recipientId, amount, secret, null, offset);

				(getTimeWithOffsetStub.calledWithExactly(offset)).should.be.true();
			});

			describe('returned out transfer transaction object', () => {
				it('should be an object', () => {
					(outTransferTransaction).should.be.type('object');
				});

				it('should have type number equal to 7', () => {
					(outTransferTransaction).should.have.property('type').and.be.type('number').and.equal(7);
				});

				it('should have amount number equal to 10 LSK', () => {
					(outTransferTransaction).should.have.property('amount').and.be.type('number').and.equal(amount);
				});

				it('should have fee number equal to 0.1 LSK', () => {
					(outTransferTransaction).should.have.property('fee').and.be.type('number').and.equal(sendFee);
				});

				it('should have recipientId equal to provided recipientId', () => {
					(outTransferTransaction).should.have.property('recipientId').and.be.equal(recipientId);
				});

				it('should have senderPublicKey hex string equal to sender public key', () => {
					(outTransferTransaction).should.have.property('senderPublicKey').and.be.hexString().and.equal(publicKey);
				});

				it('should have timestamp number equal to result of slots.getTimeWithOffset', () => {
					(outTransferTransaction).should.have.property('timestamp').and.be.type('number').and.equal(timeWithOffset);
				});

				it('should have signature hex string', () => {
					(outTransferTransaction).should.have.property('signature').and.be.hexString();
				});

				it('should be signed correctly', () => {
					const result = cryptoModule.verify(outTransferTransaction);
					(result).should.be.ok();
				});

				it('should not be signed correctly if modified', () => {
					outTransferTransaction.amount = 100;
					const result = cryptoModule.verify(outTransferTransaction);
					(result).should.be.not.ok();
				});

				it('should have an asset object', () => {
					(outTransferTransaction).should.have.property('asset').and.be.type('object');
				});

				describe('asset', () => {
					it('should have the out transfer dapp id', () => {
						(outTransferTransaction.asset)
							.should.have.property('outTransfer')
							.with.property('dappId')
							.and.be.equal(dappId);
					});

					it('should have the out transfer transaction id', () => {
						(outTransferTransaction.asset)
							.should.have.property('outTransfer')
							.with.property('transactionId')
							.and.be.equal(transactionId);
					});
				});
			});

			describe('with second secret', () => {
				beforeEach(() => {
					outTransferTransaction = createOutTransfer(
						dappId, transactionId, recipientId, amount, secret, secondSecret,
					);
				});

				it('should create an out transfer dapp transaction with a second secret', () => {
					const outTransferTransactionWithoutSecondSecret = createOutTransfer(
						dappId, transactionId, recipientId, amount, secret,
					);
					(outTransferTransaction).should.be.ok();
					(outTransferTransaction).should.not.be.equal(outTransferTransactionWithoutSecondSecret);
				});

				describe('returned out transfer transaction', () => {
					it('should have second signature hex string', () => {
						(outTransferTransaction).should.have.property('signSignature').and.be.hexString();
					});

					it('should be second signed correctly', () => {
						const result = cryptoModule
							.verifySecondSignature(outTransferTransaction, secondPublicKey);
						(result).should.be.ok();
					});

					it('should not be second signed correctly if modified', () => {
						outTransferTransaction.amount = 100;
						const result = cryptoModule
							.verifySecondSignature(outTransferTransaction, secondPublicKey);
						(result).should.not.be.ok();
					});
				});
			});
		});
	});
});
