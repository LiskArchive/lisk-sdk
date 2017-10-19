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
import registerMultisignatureAccount from '../../src/transactions/4_registerMultisignatureAccount';
import cryptoModule from '../../src/crypto';

const time = require('../../src/transactions/utils/time');

afterEach(() => sandbox.restore());

describe('#registerMultisignatureAccount transaction', () => {
	const secret = 'secret';
	const secondSecret = 'second secret';
	const keys = {
		publicKey:
			'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		privateKey:
			'2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
	};
	const secondKeys = {
		publicKey:
			'0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f',
		privateKey:
			'9ef4146f8166d32dc8051d3d9f3a0c4933e24aa8ccb439b5d9ad00078a89e2fc0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f',
	};
	const timeWithOffset = 38350076;
	const lifetime = 5;
	const min = 2;

	let keysgroup;
	let getTimeWithOffsetStub;
	let registerMultisignatureTransaction;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox
			.stub(time, 'getTimeWithOffset')
			.returns(timeWithOffset);
		keysgroup = ['+123456789', '-987654321'];
	});

	describe('without second secret', () => {
		beforeEach(() => {
			registerMultisignatureTransaction = registerMultisignatureAccount({
				secret,
				keysgroup,
				lifetime,
				min,
			});
		});

		it('should create a register multisignature transaction', () => {
			registerMultisignatureTransaction.should.be.ok();
		});

		it('should use time.getTimeWithOffset to calculate the timestamp', () => {
			getTimeWithOffsetStub.calledWithExactly(undefined).should.be.true();
		});

		it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			registerMultisignatureAccount({
				secret,
				keysgroup,
				lifetime,
				min,
				timeOffset: offset,
			});

			getTimeWithOffsetStub.calledWithExactly(offset).should.be.true();
		});

		describe('returned register multisignature transaction', () => {
			it('should be an object', () => {
				registerMultisignatureTransaction.should.be.type('object');
			});

			it('should have id string', () => {
				registerMultisignatureTransaction.should.have
					.property('id')
					.and.be.type('string');
			});

			it('should have type number equal to 4', () => {
				registerMultisignatureTransaction.should.have
					.property('type')
					.and.be.type('number')
					.and.equal(4);
			});

			it('should have amount number equal to 0', () => {
				registerMultisignatureTransaction.should.have
					.property('amount')
					.and.be.type('number')
					.and.equal(0);
			});

			it('should have fee number equal to 15 LSK', () => {
				registerMultisignatureTransaction.should.have
					.property('fee')
					.and.be.type('number')
					.and.equal(15e8);
			});

			it('should have recipientId string equal to null', () => {
				registerMultisignatureTransaction.should.have
					.property('recipientId')
					.and.be.null();
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				registerMultisignatureTransaction.should.have
					.property('senderPublicKey')
					.and.be.hexString()
					.and.equal(keys.publicKey);
			});

			it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
				registerMultisignatureTransaction.should.have
					.property('timestamp')
					.and.be.type('number')
					.and.equal(timeWithOffset);
			});

			it('should have signature hex string', () => {
				registerMultisignatureTransaction.should.have
					.property('signature')
					.and.be.hexString();
			});

			it('should be signed correctly', () => {
				const result = cryptoModule.verifyTransaction(
					registerMultisignatureTransaction,
				);
				result.should.be.ok();
			});

			it('should not be signed correctly if modified', () => {
				registerMultisignatureTransaction.amount = 100;
				const result = cryptoModule.verifyTransaction(
					registerMultisignatureTransaction,
				);
				result.should.be.not.ok();
			});

			it('should have asset', () => {
				registerMultisignatureTransaction.should.have
					.property('asset')
					.and.not.be.empty();
			});

			it('should not have a second signature', () => {
				registerMultisignatureTransaction.should.not.have.property(
					'signSignature',
				);
			});

			describe('multisignature asset', () => {
				it('should be object', () => {
					registerMultisignatureTransaction.asset.should.have
						.property('multisignature')
						.and.be.type('object');
				});

				it('should have a min number equal to provided min', () => {
					registerMultisignatureTransaction.asset.multisignature.should.have
						.property('min')
						.and.be.type('number')
						.and.be.equal(min);
				});

				it('should have a lifetime number equal to provided lifetime', () => {
					registerMultisignatureTransaction.asset.multisignature.should.have
						.property('lifetime')
						.and.be.type('number')
						.and.be.equal(lifetime);
				});

				it('should have a keysgroup array equal to provided keysgroup', () => {
					registerMultisignatureTransaction.asset.multisignature.should.have
						.property('keysgroup')
						.and.be.an.Array()
						.and.be.equal(keysgroup);
				});
			});
		});
	});

	describe('with second secret', () => {
		beforeEach(() => {
			registerMultisignatureTransaction = registerMultisignatureAccount({
				secret,
				secondSecret,
				keysgroup,
				lifetime,
				min,
			});
		});

		it('should create a multisignature transaction with a second secret', () => {
			const registerMultisignatureTransactionWithoutSecondSecret = registerMultisignatureAccount(
				{
					secret,
					secondSecret,
					keysgroup,
					lifetime,
					min,
				},
			);
			registerMultisignatureTransaction.should.be.ok();
			registerMultisignatureTransaction.should.not.be.equal(
				registerMultisignatureTransactionWithoutSecondSecret,
			);
		});

		describe('returned register multisignature transaction', () => {
			it('should have second signature hex string', () => {
				registerMultisignatureTransaction.should.have
					.property('signSignature')
					.and.be.hexString();
			});

			it('should be second signed correctly', () => {
				const result = cryptoModule.verifyTransaction(
					registerMultisignatureTransaction,
					secondKeys.publicKey,
				);
				result.should.be.ok();
			});

			it('should not be second signed correctly if modified', () => {
				registerMultisignatureTransaction.amount = 100;
				const result = cryptoModule.verifyTransaction(
					registerMultisignatureTransaction,
					secondKeys.publicKey,
				);
				result.should.not.be.ok();
			});
		});
	});
});
