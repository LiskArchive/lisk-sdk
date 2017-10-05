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
import registerDelegate from '../../src/transactions/2_registerDelegate';
import cryptoModule from '../../src/crypto';
import slots from '../../src/time/slots';

afterEach(() => sandbox.restore());

describe('#registerDelegate', () => {
	const secret = 'secret';
	const secondSecret = 'second secret';
	const publicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const secondPublicKey = '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const username = 'test_delegate_1@\\';
	const fee = 25e8;
	const timeWithOffset = 38350076;

	let getTimeWithOffsetStub;
	let delegateTransaction;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox.stub(slots, 'getTimeWithOffset').returns(timeWithOffset);
	});

	describe('without second secret', () => {
		beforeEach(() => {
			delegateTransaction = registerDelegate(secret, username);
		});

		it('should create a delegate transaction', () => {
			(delegateTransaction).should.be.ok();
		});

		it('should use slots.getTimeWithOffset to calculate the timestamp', () => {
			(getTimeWithOffsetStub.calledWithExactly(undefined)).should.be.true();
		});

		it('should use slots.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			registerDelegate(secret, username, null, offset);

			(getTimeWithOffsetStub.calledWithExactly(offset)).should.be.true();
		});

		describe('returned delegate transaction', () => {
			it('should be an object', () => {
				(delegateTransaction).should.be.type('object');
			});

			it('should have an id string', () => {
				(delegateTransaction).should.have.property('id').and.be.type('string');
			});

			it('should have type number equal to 2', () => {
				(delegateTransaction).should.have.property('type').and.be.type('number').and.equal(2);
			});

			it('should have amount number equal to 0', () => {
				(delegateTransaction).should.have.property('amount').and.be.type('number').and.equal(0);
			});

			it('should have fee number equal to 25 LSK', () => {
				(delegateTransaction).should.have.property('fee').and.be.type('number').and.equal(fee);
			});

			it('should have recipientId equal to null', () => {
				(delegateTransaction).should.have.property('recipientId').and.be.null();
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				(delegateTransaction).should.have.property('senderPublicKey').and.be.hexString().and.equal(publicKey);
			});

			it('should have timestamp number equal to result of slots.getTimeWithOffset', () => {
				(delegateTransaction).should.have.property('timestamp').and.be.type('number').and.equal(timeWithOffset);
			});

			it('should have signature hex string', () => {
				(delegateTransaction).should.have.property('signature').and.be.hexString();
			});

			it('should be signed correctly', () => {
				const result = cryptoModule.verifyTransaction(delegateTransaction);
				(result).should.be.ok();
			});

			it('should not be signed correctly if modified', () => {
				delegateTransaction.amount = 100;
				const result = cryptoModule.verifyTransaction(delegateTransaction);
				(result).should.be.not.ok();
			});

			it('should have asset', () => {
				(delegateTransaction).should.have.property('asset').and.not.be.empty();
			});

			describe('delegate asset', () => {
				it('should be an object', () => {
					(delegateTransaction.asset).should.have.property('delegate').and.be.type('object');
				});

				it('should have the provided username as a string', () => {
					(delegateTransaction.asset.delegate).should.have.property('username').and.be.type('string').and.equal(username);
				});
			});
		});
	});

	describe('with second secret', () => {
		beforeEach(() => {
			delegateTransaction = registerDelegate(secret, username, secondSecret);
		});

		it('should create a delegate transaction with a second secret', () => {
			const delegateTransactionWithoutSecondSecret = registerDelegate(secret, username);
			(delegateTransaction).should.be.ok();
			(delegateTransaction).should.not.be.equal(delegateTransactionWithoutSecondSecret);
		});

		describe('returned delegate transaction', () => {
			it('should have second signature hex string', () => {
				(delegateTransaction).should.have.property('signSignature').and.be.hexString();
			});

			it('should be second signed correctly', () => {
				const result = cryptoModule.verifyTransaction(delegateTransaction, secondPublicKey);
				(result).should.be.ok();
			});

			it('should not be second signed correctly if modified', () => {
				delegateTransaction.amount = 100;
				const result = cryptoModule.verifyTransaction(delegateTransaction, secondPublicKey);
				(result).should.not.be.ok();
			});
		});
	});
});
