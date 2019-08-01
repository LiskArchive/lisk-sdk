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
import { registerDelegate } from '../src/2_register_delegate';
import { DelegateAsset } from '../src/2_delegate_transaction';
import { TransactionJSON } from '../src/transaction_types';
import * as time from '../src/utils/time';

describe('#registerDelegate transaction', () => {
	const fixedPoint = 10 ** 8;
	const passphrase = 'secret';
	const secondPassphrase = 'second secret';
	const transactionType = 2;
	const publicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const username = 'test_delegate_1@\\';
	const fee = (25 * fixedPoint).toString();
	const timeWithOffset = 38350076;
	const amount = '0';

	let getTimeWithOffsetStub: sinon.SinonStub;
	let registerDelegateTransaction: Partial<TransactionJSON>;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox
			.stub(time, 'getTimeWithOffset')
			.returns(timeWithOffset);
		return Promise.resolve();
	});

	describe('with first passphrase', () => {
		beforeEach(() => {
			registerDelegateTransaction = registerDelegate({
				passphrase,
				username,
			});
			return Promise.resolve();
		});

		it('should create a register delegate transaction', () => {
			return expect(registerDelegateTransaction).to.be.ok;
		});

		it('should use time.getTimeWithOffset to calculate the timestamp', () => {
			return expect(getTimeWithOffsetStub).to.be.calledWithExactly(undefined);
		});

		it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			registerDelegate({ passphrase, username, timeOffset: offset });

			return expect(getTimeWithOffsetStub).to.be.calledWithExactly(offset);
		});

		it('should be an object', () => {
			return expect(registerDelegateTransaction).to.be.an('object');
		});

		it('should have an id string', () => {
			return expect(registerDelegateTransaction)
				.to.have.property('id')
				.and.be.a('string');
		});

		it('should have type number equal to 2', () => {
			return expect(registerDelegateTransaction)
				.to.have.property('type')
				.and.be.a('number')
				.and.equal(transactionType);
		});

		it('should have amount string equal to 0', () => {
			return expect(registerDelegateTransaction)
				.to.have.property('amount')
				.and.be.a('string')
				.and.equal(amount);
		});

		it('should have fee string equal to 25 LSK', () => {
			return expect(registerDelegateTransaction)
				.to.have.property('fee')
				.and.be.a('string')
				.and.equal(fee);
		});

		it('should have recipientId equal to empty string', () => {
			return expect(registerDelegateTransaction)
				.to.have.property('recipientId')
				.and.equal('');
		});

		it('should have senderPublicKey hex string equal to sender public key', () => {
			return expect(registerDelegateTransaction)
				.to.have.property('senderPublicKey')
				.and.be.hexString.and.equal(publicKey);
		});

		it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
			return expect(registerDelegateTransaction)
				.to.have.property('timestamp')
				.and.be.a('number')
				.and.equal(timeWithOffset);
		});

		it('should have signature hex string', () => {
			return expect(registerDelegateTransaction).to.have.property('signature')
				.and.be.hexString;
		});

		it('second signature property should be undefined', () => {
			return expect(registerDelegateTransaction.signSignature).to.be.eql(
				undefined,
			);
		});

		it('should have asset', () => {
			return expect(registerDelegateTransaction).to.have.property('asset').and
				.not.be.empty;
		});

		describe('delegate asset', () => {
			it('should be an object', () => {
				return expect(registerDelegateTransaction.asset)
					.to.have.property('delegate')
					.and.be.an('object');
			});

			it('should have the provided username as a string', () => {
				const { delegate } = registerDelegateTransaction.asset as DelegateAsset;
				return expect(delegate)
					.to.have.property('username')
					.and.be.a('string')
					.and.equal(username);
			});
		});
	});

	describe('with first and second passphrase', () => {
		beforeEach(() => {
			registerDelegateTransaction = registerDelegate({
				passphrase,
				username,
				secondPassphrase,
			});
			return Promise.resolve();
		});

		it('should have the second signature property as hex string', () => {
			return expect(registerDelegateTransaction).to.have.property(
				'signSignature',
			).and.be.hexString;
		});
	});

	describe('unsigned register delegate transaction', () => {
		describe('when the register delegate transaction is created without a passphrase', () => {
			beforeEach(() => {
				registerDelegateTransaction = registerDelegate({
					username,
				});
				return Promise.resolve();
			});

			it('should throw error when username was not provided', () => {
				return expect(registerDelegate.bind(null, {} as any)).to.throw(
					'Please provide a username. Expected string.',
				);
			});

			it('should throw error when username is empty string', () => {
				return expect(registerDelegate.bind(null, { username: '' })).to.throw(
					'Please provide a username. Expected string.',
				);
			});

			it('should throw error when invalid username was provided', () => {
				return expect(
					registerDelegate.bind(null, { username: '12345678901234567890a' }),
				).to.throw(
					'Username length does not match requirements. Expected to be no more than 20 characters.',
				);
			});

			it('should have the type', () => {
				return expect(registerDelegateTransaction)
					.to.have.property('type')
					.equal(transactionType);
			});

			it('should have the amount', () => {
				return expect(registerDelegateTransaction)
					.to.have.property('amount')
					.equal(amount);
			});

			it('should have the fee', () => {
				return expect(registerDelegateTransaction)
					.to.have.property('fee')
					.equal(fee);
			});

			it('should have the recipient id', () => {
				return expect(registerDelegateTransaction)
					.to.have.property('recipientId')
					.equal('');
			});

			it('should have the sender public key', () => {
				return expect(registerDelegateTransaction)
					.to.have.property('senderPublicKey')
					.equal(undefined);
			});

			it('should have the timestamp', () => {
				return expect(registerDelegateTransaction).to.have.property(
					'timestamp',
				);
			});

			it('should have the asset with the delegate', () => {
				return expect(registerDelegateTransaction)
					.to.have.property('asset')
					.with.property('delegate')
					.with.property('username');
			});

			it('should not have the signature', () => {
				return expect(registerDelegateTransaction).not.to.have.property(
					'signature',
				);
			});

			it('should not have the id', () => {
				return expect(registerDelegateTransaction).not.to.have.property('id');
			});
		});
	});
});
