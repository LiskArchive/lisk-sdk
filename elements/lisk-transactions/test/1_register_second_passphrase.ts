/*
 * Copyright © 2019 Lisk Foundation
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
import { registerSecondPassphrase } from '../src/1_register_second_passphrase';
import { SecondSignatureAsset } from '../src/1_second_signature_transaction';
import { TransactionJSON } from '../src/transaction_types';
import * as time from '../src/utils/time';

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
	const fee = (5 * fixedPoint).toString();
	const amount = '0';

	let getTimeWithOffsetStub: sinon.SinonStub;
	let registerSecondPassphraseTransaction: Partial<TransactionJSON>;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox
			.stub(time, 'getTimeWithOffset')
			.returns(timeWithOffset);
		registerSecondPassphraseTransaction = registerSecondPassphrase({
			passphrase,
			secondPassphrase,
		});
		return Promise.resolve();
	});

	it('should create a register second passphrase transaction', () => {
		return expect(registerSecondPassphraseTransaction).to.be.ok;
	});

	it('should use time.getTimeWithOffset to calculate the timestamp', () => {
		return expect(getTimeWithOffsetStub).to.be.calledWithExactly(undefined);
	});

	it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
		const offset = -10;
		registerSecondPassphrase({
			passphrase,
			secondPassphrase,
			timeOffset: offset,
		});

		return expect(getTimeWithOffsetStub).to.be.calledWithExactly(offset);
	});

	describe('returned register second passphrase transaction', () => {
		it('should be an object', () => {
			return expect(registerSecondPassphraseTransaction).to.be.an('object');
		});

		it('should have an id string', () => {
			return expect(registerSecondPassphraseTransaction)
				.to.have.property('id')
				.and.be.a('string');
		});

		it('should have type number equal to 1', () => {
			return expect(registerSecondPassphraseTransaction)
				.to.have.property('type')
				.and.be.a('number')
				.and.equal(transactionType);
		});

		it('should have amount string equal to 0', () => {
			return expect(registerSecondPassphraseTransaction)
				.to.have.property('amount')
				.and.be.a('string')
				.and.equal(amount);
		});

		it('should have fee string equal to second passphrase fee', () => {
			return expect(registerSecondPassphraseTransaction)
				.to.have.property('fee')
				.and.be.a('string')
				.and.equal(secondPassphraseFee);
		});

		it('should have recipientId equal to empty string', () => {
			return expect(registerSecondPassphraseTransaction)
				.to.have.property('recipientId')
				.and.equal('');
		});

		it('should have senderPublicKey hex string equal to sender public key', () => {
			return expect(registerSecondPassphraseTransaction)
				.to.have.property('senderPublicKey')
				.and.be.hexString.and.equal(publicKey);
		});

		it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
			return expect(registerSecondPassphraseTransaction)
				.to.have.property('timestamp')
				.and.be.a('number')
				.and.equal(timeWithOffset);
		});

		it('should have signature hex string', () => {
			return expect(registerSecondPassphraseTransaction).to.have.property(
				'signature',
			).and.be.hexString;
		});

		it('should have asset object', () => {
			return expect(registerSecondPassphraseTransaction).to.have.property(
				'asset',
			).and.not.be.empty;
		});

		it('should have an undefined signSignature property', () => {
			return expect(registerSecondPassphraseTransaction.signSignature).to.be
				.undefined;
		});

		describe('signature asset', () => {
			it('should be an object', () => {
				return expect(registerSecondPassphraseTransaction.asset)
					.to.have.property('signature')
					.and.be.an('object').and.not.be.empty;
			});

			it('should have a 32-byte publicKey hex string', () => {
				expect(registerSecondPassphraseTransaction.asset)
					.to.have.property('signature')
					.with.property('publicKey').and.be.hexString;
				const {
					publicKey,
				} = registerSecondPassphraseTransaction.asset as SecondSignatureAsset;
				return expect(Buffer.from(publicKey, 'hex')).to.have.length(32);
			});

			it('should have a publicKey equal to the public key for the provided second passphrase', () => {
				return expect(registerSecondPassphraseTransaction.asset)
					.to.have.property('signature')
					.with.property('publicKey')
					.and.equal(secondPublicKey);
			});

			it('should have the correct publicKey if the provided second passphrase is an empty string', () => {
				registerSecondPassphraseTransaction = registerSecondPassphrase({
					passphrase,
					secondPassphrase: '',
				});
				const {
					publicKey,
				} = registerSecondPassphraseTransaction.asset as SecondSignatureAsset;
				return expect(publicKey).to.be.equal(emptyStringPublicKey);
			});
		});
	});

	describe('unsigned register second passphrase transaction', () => {
		describe('when the register second passphrase transaction is created without a passphrase', () => {
			beforeEach(() => {
				registerSecondPassphraseTransaction = registerSecondPassphrase({
					secondPassphrase,
				});
				return Promise.resolve();
			});

			it('should throw error when secondPassphrase was not provided', () => {
				return expect(registerSecondPassphrase.bind(null, {} as any)).to.throw(
					'Please provide a secondPassphrase. Expected string.',
				);
			});

			it('should not throw error when secondPassphrase is empty string', () => {
				return expect(
					registerSecondPassphrase.bind(null, { secondPassphrase: '' }),
				).to.not.throw();
			});

			it('should have the type', () => {
				return expect(registerSecondPassphraseTransaction)
					.to.have.property('type')
					.equal(transactionType);
			});

			it('should have the amount', () => {
				return expect(registerSecondPassphraseTransaction)
					.to.have.property('amount')
					.equal(amount);
			});

			it('should have the fee', () => {
				return expect(registerSecondPassphraseTransaction)
					.to.have.property('fee')
					.equal(fee);
			});

			it('should have the recipient', () => {
				return expect(registerSecondPassphraseTransaction)
					.to.have.property('recipientId')
					.equal('');
			});

			it('should have the sender public key', () => {
				return expect(registerSecondPassphraseTransaction)
					.to.have.property('senderPublicKey')
					.equal(undefined);
			});

			it('should have the timestamp', () => {
				return expect(registerSecondPassphraseTransaction).to.have.property(
					'timestamp',
				);
			});

			it('should have the asset with the signature with the public key', () => {
				return expect(registerSecondPassphraseTransaction)
					.to.have.property('asset')
					.with.property('signature')
					.with.property('publicKey')
					.of.a('string');
			});

			it('should not have the signature', () => {
				return expect(registerSecondPassphraseTransaction).not.to.have.property(
					'signature',
				);
			});

			it('should not have the id', () => {
				return expect(registerSecondPassphraseTransaction).not.to.have.property(
					'id',
				);
			});
		});
	});
});
