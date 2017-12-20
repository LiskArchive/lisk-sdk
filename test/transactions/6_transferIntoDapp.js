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
import transferIntoDapp from '../../src/transactions/6_transferIntoDapp';

const time = require('../../src/transactions/utils/time');

describe('#transferIntoDapp transaction', () => {
	const fixedPoint = 10 ** 8;
	const dappId = '1234213';
	const passphrase = 'secret';
	const secondPassphrase = 'secondSecret';
	const publicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const amount = (10 * fixedPoint).toString();
	const transferFee = (0.1 * fixedPoint).toString();
	const timeWithOffset = 38350076;
	const offset = -10;

	let getTimeWithOffsetStub;
	let transferIntoDappTransaction;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox
			.stub(time, 'getTimeWithOffset')
			.returns(timeWithOffset);
	});

	describe('with first passphrase', () => {
		beforeEach(() => {
			transferIntoDappTransaction = transferIntoDapp({
				dappId,
				amount,
				passphrase,
			});
		});

		it('should create an inTransfer dapp transaction', () => {
			return transferIntoDappTransaction.should.be.ok();
		});

		it('should use time.getTimeWithOffset to get the time for the timestamp', () => {
			return getTimeWithOffsetStub.should.be.calledWithExactly(undefined);
		});

		it('should use time.getTimeWithOffset with an offset of -10 seconds to get the time for the timestamp', () => {
			transferIntoDapp({ dappId, amount, passphrase, timeOffset: offset });

			return getTimeWithOffsetStub.should.be.calledWithExactly(offset);
		});

		describe('returned inTransfer transaction object', () => {
			it('should be an object', () => {
				return transferIntoDappTransaction.should.be.type('object');
			});

			it('should have id string', () => {
				return transferIntoDappTransaction.should.have
					.property('id')
					.and.be.type('string');
			});

			it('should have type number equal to 6', () => {
				return transferIntoDappTransaction.should.have
					.property('type')
					.and.be.type('number')
					.and.equal(6);
			});

			it('should have amount string equal to 10 LSK', () => {
				return transferIntoDappTransaction.should.have
					.property('amount')
					.and.be.type('string')
					.and.equal(amount);
			});

			it('should have fee string equal to 0.1 LSK', () => {
				return transferIntoDappTransaction.should.have
					.property('fee')
					.and.be.type('string')
					.and.equal(transferFee);
			});

			it('should have recipientId equal to null', () => {
				return transferIntoDappTransaction.should.have
					.property('recipientId')
					.be.null();
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				return transferIntoDappTransaction.should.have
					.property('senderPublicKey')
					.and.be.hexString()
					.and.equal(publicKey);
			});

			it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
				return transferIntoDappTransaction.should.have
					.property('timestamp')
					.and.be.type('number')
					.and.equal(timeWithOffset);
			});

			it('should have signature hex string', () => {
				return transferIntoDappTransaction.should.have
					.property('signature')
					.and.be.hexString();
			});

			it('should not have the second signature property', () => {
				return transferIntoDappTransaction.should.not.have.property(
					'signSignature',
				);
			});

			it('should have an asset object', () => {
				return transferIntoDappTransaction.should.have
					.property('asset')
					.and.be.type('object');
			});

			describe('asset', () => {
				it('should have the in transfer dapp id', () => {
					return transferIntoDappTransaction.asset.should.have
						.property('inTransfer')
						.with.property('dappId')
						.and.be.equal(dappId);
				});
			});
		});
	});

	describe('with first and second passphrase', () => {
		beforeEach(() => {
			transferIntoDappTransaction = transferIntoDapp({
				dappId,
				amount,
				passphrase,
				secondPassphrase,
			});
		});

		it('should have the second signature property as hex string', () => {
			return transferIntoDappTransaction.should.have
				.property('signSignature')
				.and.be.hexString();
		});
	});
});
