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
import dappInTransfer from '../../src/transactions/6_dappInTransfer';
import cryptoModule from '../../src/crypto';
import slots from '../../src/time/slots';

afterEach(() => sandbox.restore());

describe('#dappInTransfer', () => {
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
	let dappInTransferTransaction;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox.stub(slots, 'getTimeWithOffset').returns(timeWithOffset);
	});

	describe('with one secret', () => {
		beforeEach(() => {
			dappInTransferTransaction = dappInTransfer(dappId, amount, secret);
		});

		it('should create an in transfer dapp transaction', () => {
			(dappInTransferTransaction).should.be.ok();
		});

		it('should use time slots to get the time for the timestamp', () => {
			(getTimeWithOffsetStub.calledWithExactly(undefined)).should.be.true();
		});

		it('should use time slots with an offset of -10 seconds to get the time for the timestamp', () => {
			dappInTransfer(dappId, amount, secret, null, offset);

			(getTimeWithOffsetStub.calledWithExactly(offset)).should.be.true();
		});

		describe('returned in transfer transaction object', () => {
			it('should be an object', () => {
				(dappInTransferTransaction).should.be.type('object');
			});

			it('should have id string', () => {
				(dappInTransferTransaction).should.have.property('id').and.be.type('string');
			});

			it('should have type number equal to 6', () => {
				(dappInTransferTransaction).should.have.property('type').and.be.type('number').and.equal(6);
			});

			it('should have amount number equal to 10 LSK', () => {
				(dappInTransferTransaction).should.have.property('amount').and.be.type('number').and.equal(amount);
			});

			it('should have fee number equal to 0.1 LSK', () => {
				(dappInTransferTransaction).should.have.property('fee').and.be.type('number').and.equal(sendFee);
			});

			it('should have recipientId equal to null', () => {
				(dappInTransferTransaction).should.have.property('recipientId').be.null();
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				(dappInTransferTransaction).should.have.property('senderPublicKey').and.be.hexString().and.equal(publicKey);
			});

			it('should have timestamp number equal to result of slots.getTimeWithOffset', () => {
				(dappInTransferTransaction).should.have.property('timestamp').and.be.type('number').and.equal(timeWithOffset);
			});

			it('should have signature hex string', () => {
				(dappInTransferTransaction).should.have.property('signature').and.be.hexString();
			});

			it('should be signed correctly', () => {
				const result = cryptoModule.verifyTransaction(dappInTransferTransaction);
				(result).should.be.ok();
			});

			it('should not be signed correctly if modified', () => {
				dappInTransferTransaction.amount = 100;
				const result = cryptoModule.verifyTransaction(dappInTransferTransaction);
				(result).should.be.not.ok();
			});

			it('should have an asset object', () => {
				(dappInTransferTransaction).should.have.property('asset').and.be.type('object');
			});

			describe('asset', () => {
				it('should have the in transfer dapp id', () => {
					(dappInTransferTransaction.asset)
						.should.have.property('inTransfer')
						.with.property('dappId')
						.and.be.equal(dappId);
				});
			});
		});
	});

	describe('with second secret', () => {
		beforeEach(() => {
			dappInTransferTransaction = dappInTransfer(dappId, amount, secret, secondSecret);
		});

		it('should create an in transfer dapp transaction with a second secret', () => {
			const dappInTransferTransactionWithoutSecondSecret = dappInTransfer(dappId, amount, secret);
			(dappInTransferTransaction).should.be.ok();
			(dappInTransferTransaction).should.not.be.equal(dappInTransferTransactionWithoutSecondSecret);
		});

		describe('returned in transfer transaction', () => {
			it('should have second signature hex string', () => {
				(dappInTransferTransaction).should.have.property('signSignature').and.be.hexString();
			});

			it('should be second signed correctly', () => {
				const result = cryptoModule.verifyTransaction(dappInTransferTransaction, secondPublicKey);
				(result).should.be.ok();
			});

			it('should not be second signed correctly if modified', () => {
				dappInTransferTransaction.amount = 100;
				const result = cryptoModule.verifyTransaction(dappInTransferTransaction, secondPublicKey);
				(result).should.not.be.ok();
			});
		});
	});
});
