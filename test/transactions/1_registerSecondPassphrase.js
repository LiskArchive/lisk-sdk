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
import registerSecondPassphrase from '../../src/transactions/1_registerSecondPassphrase';

const time = require('../../src/transactions/utils/time');

describe('#registerSecondPassphrase transaction', () => {
	const fixedPoint = 10 ** 8;
	const passphrase = 'secret';
	const secondPassphrase = 'second secret';
	const transactionType = 1;
	const publicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const secondPublicKey =
		'0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const emptyStringPublicKey =
		'be907b4bac84fee5ce8811db2defc9bf0b2a2a2bbc3d54d8a2257ecd70441962';
	const secondPassphraseFee = (5 * fixedPoint).toString();
	const timeWithOffset = 38350076;
	const unsigned = true;
	const fee = (5 * fixedPoint).toString();
	const amount = '0';

	let getTimeWithOffsetStub;
	let registerSecondPassphraseTransaction;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox
			.stub(time, 'getTimeWithOffset')
			.returns(timeWithOffset);
		registerSecondPassphraseTransaction = registerSecondPassphrase({
			passphrase,
			secondPassphrase,
		});
	});

	it('should create a register second passphrase transaction', () => {
		return registerSecondPassphraseTransaction.should.be.ok();
	});

	it('should use time.getTimeWithOffset to calculate the timestamp', () => {
		return getTimeWithOffsetStub.should.be.calledWithExactly(undefined);
	});

	it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
		const offset = -10;
		registerSecondPassphrase({
			passphrase,
			secondPassphrase,
			timeOffset: offset,
		});

		return getTimeWithOffsetStub.should.be.calledWithExactly(offset);
	});

	describe('returned register second passphrase transaction', () => {
		it('should be an object', () => {
			return registerSecondPassphraseTransaction.should.be.type('object');
		});

		it('should have an id string', () => {
			return registerSecondPassphraseTransaction.should.have
				.property('id')
				.and.be.type('string');
		});

		it('should have type number equal to 1', () => {
			return registerSecondPassphraseTransaction.should.have
				.property('type')
				.and.be.type('number')
				.and.equal(transactionType);
		});

		it('should have amount string equal to 0', () => {
			return registerSecondPassphraseTransaction.should.have
				.property('amount')
				.and.be.type('string')
				.and.equal(amount);
		});

		it('should have fee string equal to second passphrase fee', () => {
			return registerSecondPassphraseTransaction.should.have
				.property('fee')
				.and.be.type('string')
				.and.equal(secondPassphraseFee);
		});

		it('should have recipientId equal to null', () => {
			return registerSecondPassphraseTransaction.should.have
				.property('recipientId')
				.and.be.null();
		});

		it('should have senderPublicKey hex string equal to sender public key', () => {
			return registerSecondPassphraseTransaction.should.have
				.property('senderPublicKey')
				.and.be.hexString()
				.and.equal(publicKey);
		});

		it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
			return registerSecondPassphraseTransaction.should.have
				.property('timestamp')
				.and.be.type('number')
				.and.equal(timeWithOffset);
		});

		it('should have signature hex string', () => {
			return registerSecondPassphraseTransaction.should.have
				.property('signature')
				.and.be.hexString();
		});

		it('should have asset object', () => {
			return registerSecondPassphraseTransaction.should.have
				.property('asset')
				.and.not.be.empty();
		});

		it('should not have a signSignature property', () => {
			return registerSecondPassphraseTransaction.should.not.have.property(
				'signSignature',
			);
		});

		describe('signature asset', () => {
			it('should be an object', () => {
				return registerSecondPassphraseTransaction.asset.should.have
					.property('signature')
					.and.be.type('object')
					.and.not.be.empty();
			});

			it('should have a 32-byte publicKey hex string', () => {
				registerSecondPassphraseTransaction.asset.should.have
					.property('signature')
					.with.property('publicKey')
					.and.be.hexString();
				return Buffer.from(
					registerSecondPassphraseTransaction.asset.signature.publicKey,
					'hex',
				).should.have.length(32);
			});

			it('should have a publicKey equal to the public key for the provided second passphrase', () => {
				return registerSecondPassphraseTransaction.asset.should.have
					.property('signature')
					.with.property('publicKey')
					.and.equal(secondPublicKey);
			});

			it('should have the correct publicKey if the provided second passphrase is an empty string', () => {
				registerSecondPassphraseTransaction = registerSecondPassphrase({
					passphrase,
					secondPassphrase: '',
				});
				return registerSecondPassphraseTransaction.asset.signature.publicKey.should.be.equal(
					emptyStringPublicKey,
				);
			});
		});
	});

	describe('unsigned register second passphrase transaction', () => {
		beforeEach(() => {
			registerSecondPassphraseTransaction = registerSecondPassphrase({
				secondPassphrase,
				unsigned,
			});
		});

		describe('when the register second passphrase transaction is created without signature', () => {
			it('should have the type', () => {
				registerSecondPassphraseTransaction.should.have
					.property('type')
					.equal(transactionType);
			});

			it('should have the amount', () => {
				registerSecondPassphraseTransaction.should.have
					.property('amount')
					.equal(amount);
			});

			it('should have the fee', () => {
				registerSecondPassphraseTransaction.should.have
					.property('fee')
					.equal(fee);
			});

			it('should have the recipient', () => {
				registerSecondPassphraseTransaction.should.have
					.property('recipientId')
					.equal(null);
			});

			it('should have the sender public key', () => {
				registerSecondPassphraseTransaction.should.have
					.property('senderPublicKey')
					.equal(null);
			});

			it('should have the timestamp', () => {
				registerSecondPassphraseTransaction.should.have.property('timestamp');
			});

			it('should have the asset with the signature with the public key', () => {
				registerSecondPassphraseTransaction.should.have
					.property('asset')
					.with.property('signature')
					.with.property('publicKey')
					.and.be.type('string');
			});

			it('should not have the signature', () => {
				registerSecondPassphraseTransaction.should.not.have.property(
					'signature',
				);
			});

			it('should not have the id', () => {
				registerSecondPassphraseTransaction.should.not.have.property('id');
			});
		});
	});
});
