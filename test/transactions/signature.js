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
import signature from '../../src/transactions/signature';
import cryptoModule from '../../src/transactions/crypto';
import slots from '../../src/time/slots';

describe('signature module', () => {
	describe('exports', () => {
		it('should be an object', () => {
			(signature).should.be.type('object');
		});

		it('should export createSignature function', () => {
			(signature).should.have.property('createSignature').be.type('function');
		});
	});

	describe('#createSignature', () => {
		const { createSignature } = signature;
		const secret = 'secret';
		const secondSecret = 'second secret';
		const publicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
		const secondPublicKey = '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
		const emptyStringPublicKey = 'be907b4bac84fee5ce8811db2defc9bf0b2a2a2bbc3d54d8a2257ecd70441962';
		const signatureFee = 5e8;
		const address = '18160565574430594874L';
		const timeWithOffset = 38350076;

		let getAddressStub;
		let getTimeWithOffsetStub;
		let signatureTransaction;

		beforeEach(() => {
			getAddressStub = sinon.stub(cryptoModule, 'getAddress').returns(address);
			getTimeWithOffsetStub = sinon.stub(slots, 'getTimeWithOffset').returns(timeWithOffset);
			signatureTransaction = createSignature(secret, secondSecret);
		});

		afterEach(() => {
			getAddressStub.restore();
			getTimeWithOffsetStub.restore();
		});

		it('should create a signature transaction', () => {
			(signatureTransaction).should.be.ok();
		});

		it('should use slots.getTimeWithOffset to calculate the timestamp', () => {
			(getTimeWithOffsetStub.calledWithExactly(undefined)).should.be.true();
		});

		it('should use slots.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			createSignature(secret, secondSecret, offset);

			(getTimeWithOffsetStub.calledWithExactly(offset)).should.be.true();
		});

		describe('returned signature transaction', () => {
			it('should be an object', () => {
				(signatureTransaction).should.be.type('object');
			});

			it('should have type number equal to 1', () => {
				(signatureTransaction).should.have.property('type').and.be.type('number').and.equal(1);
			});

			it('should have amount number equal to 0', () => {
				(signatureTransaction).should.have.property('amount').and.be.type('number').and.equal(0);
			});

			it('should have fee number equal to signature fee', () => {
				(signatureTransaction).should.have.property('fee').and.be.type('number').and.equal(signatureFee);
			});

			it('should have recipientId equal to null', () => {
				(signatureTransaction).should.have.property('recipientId').and.be.null();
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				(signatureTransaction).should.have.property('senderPublicKey').and.be.hexString().and.equal(publicKey);
			});

			it('should have timestamp number equal to result of slots.getTimeWithOffset', () => {
				(signatureTransaction).should.have.property('timestamp').and.be.type('number').and.equal(timeWithOffset);
			});

			it('should have signature hex string', () => {
				(signatureTransaction).should.have.property('signature').and.be.hexString();
			});

			it('should have an id string', () => {
				(signatureTransaction).should.have.property('id').and.be.type('string');
			});

			it('should be signed correctly', () => {
				const result = cryptoModule.verify(signatureTransaction);
				(result).should.be.ok();
			});

			it('should not be signed correctly if modified', () => {
				signatureTransaction.amount = 100;
				const result = cryptoModule.verify(signatureTransaction);
				(result).should.be.not.ok();
			});

			it('should have asset object', () => {
				(signatureTransaction).should.have.property('asset').and.not.be.empty();
			});

			it('should not have a signSignature property', () => {
				(signatureTransaction).should.not.have.property('signSignature');
			});

			describe('signature asset', () => {
				it('should be an object', () => {
					(signatureTransaction.asset).should.have.property('signature')
						.and.be.type('object')
						.and.not.be.empty();
				});

				it('should have a 32-byte publicKey hex string', () => {
					(signatureTransaction.asset).should.have.property('signature')
						.with.property('publicKey')
						.and.be.hexString();
					(Buffer.from(signatureTransaction.asset.signature.publicKey, 'hex')).should.have.length(32);
				});

				it('should have a publicKey equal to the public key for the provided second secret', () => {
					(signatureTransaction.asset).should.have.property('signature')
						.with.property('publicKey')
						.and.equal(secondPublicKey);
				});

				it('should have the correct publicKey if the provided second secret is an empty string', () => {
					signatureTransaction = createSignature('secret', '');
					(signatureTransaction.asset.signature.publicKey).should.be.equal(emptyStringPublicKey);
				});
			});
		});
	});
});
