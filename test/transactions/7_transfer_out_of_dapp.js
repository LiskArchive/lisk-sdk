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
import transferOutOfDapp from 'transactions/7_transfer_out_of_dapp';
// Require is used for stubbing
const time = require('transactions/utils/time');

describe('#transferOutOfDapp', () => {
	const fixedPoint = 10 ** 8;
	const transactionType = 7;
	const transactionId = '9876567';
	const recipientId = '989234L';
	const dappId = '1234213';
	const passphrase = 'secret';
	const secondPassphrase = 'secondSecret';
	const publicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const amount = (10 * fixedPoint).toString();
	const fee = (0.1 * fixedPoint).toString();
	const timeWithOffset = 38350076;
	const offset = -10;

	let getTimeWithOffsetStub;
	let transferOutOfDappTransaction;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox
			.stub(time, 'getTimeWithOffset')
			.returns(timeWithOffset);
		return Promise.resolve();
	});

	describe('with first passphrase', () => {
		beforeEach(() => {
			transferOutOfDappTransaction = transferOutOfDapp({
				dappId,
				transactionId,
				recipientId,
				amount,
				passphrase,
			});
			return Promise.resolve();
		});

		it('should create an out transfer dapp transaction', () => {
			return expect(transferOutOfDappTransaction).to.be.ok;
		});

		it('should use time.getTimeWithOffset to get the time for the timestamp', () => {
			return expect(getTimeWithOffsetStub).to.be.calledWithExactly(undefined);
		});

		it('should use time.getTimeWithOffset with an offset of -10 seconds to get the time for the timestamp', () => {
			transferOutOfDapp({
				dappId,
				transactionId,
				recipientId,
				amount,
				passphrase,
				timeOffset: offset,
			});

			return expect(getTimeWithOffsetStub).to.be.calledWithExactly(offset);
		});

		describe('returned out of dapp transfer transaction object', () => {
			it('should be an object', () => {
				return expect(transferOutOfDappTransaction).to.be.an('object');
			});

			it('should have id string', () => {
				return expect(transferOutOfDappTransaction)
					.to.have.property('id')
					.and.be.a('string');
			});

			it('should have type number equal to 7', () => {
				return expect(transferOutOfDappTransaction)
					.to.have.property('type')
					.and.be.a('number')
					.and.equal(transactionType);
			});

			it('should have amount string equal to 10 LSK', () => {
				return expect(transferOutOfDappTransaction)
					.to.have.property('amount')
					.and.be.a('string')
					.and.equal(amount);
			});

			it('should have fee string equal to 0.1 LSK', () => {
				return expect(transferOutOfDappTransaction)
					.to.have.property('fee')
					.and.be.a('string')
					.and.equal(fee);
			});

			it('should have recipientId equal to provided recipientId', () => {
				return expect(transferOutOfDappTransaction)
					.to.have.property('recipientId')
					.and.be.equal(recipientId);
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				return expect(transferOutOfDappTransaction)
					.to.have.property('senderPublicKey')
					.and.be.hexString.and.equal(publicKey);
			});

			it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
				return expect(transferOutOfDappTransaction)
					.to.have.property('timestamp')
					.and.be.a('number')
					.and.equal(timeWithOffset);
			});

			it('should have signature hex string', () => {
				return expect(transferOutOfDappTransaction).to.have.property(
					'signature',
				).and.be.hexString;
			});

			it('should not have the second signature property', () => {
				return expect(transferOutOfDappTransaction).not.to.have.property(
					'signSignature',
				);
			});

			it('should have an asset object', () => {
				return expect(transferOutOfDappTransaction)
					.to.have.property('asset')
					.and.be.an('object');
			});

			describe('asset', () => {
				it('should have the out transfer dapp id', () => {
					return expect(transferOutOfDappTransaction.asset)
						.to.have.property('outTransfer')
						.with.property('dappId')
						.and.be.equal(dappId);
				});

				it('should have the out transfer transaction id', () => {
					return expect(transferOutOfDappTransaction.asset)
						.to.have.property('outTransfer')
						.with.property('transactionId')
						.and.be.equal(transactionId);
				});
			});
		});

		describe('with first and second passphrase', () => {
			beforeEach(() => {
				transferOutOfDappTransaction = transferOutOfDapp({
					dappId,
					transactionId,
					recipientId,
					amount,
					passphrase,
					secondPassphrase,
				});
				return Promise.resolve();
			});

			it('should have the second signature property as hex string', () => {
				return expect(transferOutOfDappTransaction).to.have.property(
					'signSignature',
				).and.be.hexString;
			});
		});
	});

	describe('unsigned transfer out of dapp transaction', () => {
		describe('when the transfer out of dapp transaction is created without a passphrase', () => {
			beforeEach(() => {
				transferOutOfDappTransaction = transferOutOfDapp({
					dappId,
					transactionId,
					recipientId,
					amount,
				});
				return Promise.resolve();
			});

			it('should have the type', () => {
				return expect(transferOutOfDappTransaction)
					.to.have.property('type')
					.equal(transactionType);
			});

			it('should have the amount', () => {
				return expect(transferOutOfDappTransaction)
					.to.have.property('amount')
					.equal(amount);
			});

			it('should have the fee', () => {
				return expect(transferOutOfDappTransaction)
					.to.have.property('fee')
					.equal(fee);
			});

			it('should have the recipient id', () => {
				return expect(transferOutOfDappTransaction)
					.to.have.property('recipientId')
					.equal(recipientId);
			});

			it('should have the sender public key', () => {
				return expect(transferOutOfDappTransaction)
					.to.have.property('senderPublicKey')
					.equal(null);
			});

			it('should have the timestamp', () => {
				return expect(transferOutOfDappTransaction).to.have.property(
					'timestamp',
				);
			});

			it('should have the asset with the out transfer with dappId and transactionId', () => {
				return expect(transferOutOfDappTransaction)
					.to.have.nested.property('asset.outTransfer')
					.with.all.keys('dappId', 'transactionId');
			});

			it('should not have the signature', () => {
				return expect(transferOutOfDappTransaction).not.to.have.property(
					'signature',
				);
			});

			it('should not have the id', () => {
				return expect(transferOutOfDappTransaction).not.to.have.property('id');
			});
		});
	});
});
