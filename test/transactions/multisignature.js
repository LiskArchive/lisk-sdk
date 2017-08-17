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
import multisignature from '../../src/transactions/multisignature';
import cryptoModule from '../../src/transactions/crypto';
import slots from '../../src/time/slots';

describe('multisignature module', () => {
	const secret = 'secret';
	const secondSecret = 'second secret';
	const keys = {
		publicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		privateKey: '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
	};
	const secondKeys = {
		publicKey: '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f',
		privateKey: '9ef4146f8166d32dc8051d3d9f3a0c4933e24aa8ccb439b5d9ad00078a89e2fc0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f',
	};
	const timeWithOffset = 38350076;

	let getTimeWithOffsetStub;

	beforeEach(() => {
		getTimeWithOffsetStub = sinon.stub(slots, 'getTimeWithOffset').returns(timeWithOffset);
	});

	afterEach(() => {
		getTimeWithOffsetStub.restore();
	});

	describe('exports', () => {
		it('should be an object', () => {
			(multisignature).should.be.type('object');
		});

		it('should export signTransaction function', () => {
			(multisignature).should.have.property('signTransaction').be.type('function');
		});

		it('should export createMultisignature function', () => {
			(multisignature).should.have.property('createMultisignature').be.type('function');
		});

		it('should export createTransaction function', () => {
			(multisignature).should.have.property('createTransaction').be.type('function');
		});
	});

	describe('#createMultisignature', () => {
		const { createMultisignature } = multisignature;
		const keysgroup = ['+123456789', '-987654321'];
		const lifetime = 5;
		const min = 2;

		let multisignatureTransaction;

		describe('without second secret', () => {
			beforeEach(() => {
				multisignatureTransaction = createMultisignature(secret, null, keysgroup, lifetime, min);
			});

			it('should create a multisignature transaction', () => {
				(multisignatureTransaction).should.be.ok();
			});

			it('should use slots.getTimeWithOffset to calculate the timestamp', () => {
				(getTimeWithOffsetStub.calledWithExactly(undefined)).should.be.true();
			});

			it('should use slots.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
				const offset = -10;
				createMultisignature(secret, null, keysgroup, lifetime, min, offset);

				(getTimeWithOffsetStub.calledWithExactly(offset)).should.be.true();
			});

			describe('returned multisignature transaction', () => {
				it('should be an object', () => {
					(multisignatureTransaction).should.be.type('object');
				});

				it('should have type number equal to 4', () => {
					(multisignatureTransaction).should.have.property('type').and.be.type('number').and.equal(4);
				});

				it('should have amount number equal to 0', () => {
					(multisignatureTransaction).should.have.property('amount').and.be.type('number').and.equal(0);
				});

				it('should have fee number equal to 15 LSK', () => {
					(multisignatureTransaction).should.have.property('fee').and.be.type('number').and.equal(15e8);
				});

				it('should have recipientId string equal to null', () => {
					(multisignatureTransaction).should.have.property('recipientId').and.be.null();
				});

				it('should have senderPublicKey hex string equal to sender public key', () => {
					(multisignatureTransaction).should.have.property('senderPublicKey').and.be.hexString().and.equal(keys.publicKey);
				});

				it('should have timestamp number equal to result of slots.getTimeWithOffset', () => {
					(multisignatureTransaction).should.have.property('timestamp').and.be.type('number').and.equal(timeWithOffset);
				});

				it('should have signature hex string', () => {
					(multisignatureTransaction).should.have.property('signature').and.be.hexString();
				});

				it('should be signed correctly', () => {
					const result = cryptoModule.verify(multisignatureTransaction);
					(result).should.be.ok();
				});

				it('should not be signed correctly if modified', () => {
					multisignatureTransaction.amount = 100;
					const result = cryptoModule.verify(multisignatureTransaction);
					(result).should.be.not.ok();
				});

				it('should have asset', () => {
					(multisignatureTransaction).should.have.property('asset').and.not.be.empty();
				});

				it('should have id string', () => {
					(multisignatureTransaction).should.have.property('id').and.be.type('string');
				});

				it('should not have a second signature', () => {
					(multisignatureTransaction).should.not.have.property('signSignature');
				});

				describe('multisignature asset', () => {
					it('should be object', () => {
						(multisignatureTransaction.asset).should.have.property('multisignature').and.be.type('object');
					});

					it('should have a min number equal to provided min', () => {
						(multisignatureTransaction.asset.multisignature).should.have.property('min').and.be.type('number').and.be.equal(min);
					});

					it('should have a lifetime number equal to provided lifetime', () => {
						(multisignatureTransaction.asset.multisignature).should.have.property('lifetime').and.be.type('number').and.be.equal(lifetime);
					});

					it('should have a keysgroup array equal to provided keysgroup', () => {
						(multisignatureTransaction.asset.multisignature).should.have.property('keysgroup').and.be.an.Array().and.be.equal(keysgroup);
					});
				});
			});
		});

		describe('with second secret', () => {
			beforeEach(() => {
				multisignatureTransaction = createMultisignature(
					secret, secondSecret, keysgroup, lifetime, min,
				);
			});

			it('should create a multisignature transaction with a second secret', () => {
				const multisignatureTransactionWithoutSecondSecret = createMultisignature(
					secret, secondSecret, keysgroup, lifetime, min,
				);
				(multisignatureTransaction).should.be.ok();
				(multisignatureTransaction)
					.should.not.be.equal(multisignatureTransactionWithoutSecondSecret);
			});

			describe('returned multisignature transaction', () => {
				it('should have second signature hex string', () => {
					(multisignatureTransaction).should.have.property('signSignature').and.be.hexString();
				});

				it('should be second signed correctly', () => {
					const result = cryptoModule
						.verifySecondSignature(multisignatureTransaction, secondKeys.publicKey);
					(result).should.be.ok();
				});

				it('should not be second signed correctly if modified', () => {
					multisignatureTransaction.amount = 100;
					const result = cryptoModule
						.verifySecondSignature(multisignatureTransaction, secondKeys.publicKey);
					(result).should.not.be.ok();
				});
			});
		});
	});

	describe('#createTransaction', () => {
		const { createTransaction } = multisignature;
		const recipientId = '123456789L';
		const amount = 50e8;
		const sendFee = 0.1e8;
		const requesterPublicKey = 'abc123';

		let transactionTransaction;

		describe('without second secret', () => {
			beforeEach(() => {
				transactionTransaction = createTransaction(
					recipientId, amount, secret, null, requesterPublicKey,
				);
			});

			it('should create a multisignature transaction', () => {
				(transactionTransaction).should.be.ok();
			});

			it('should use slots.getTimeWithOffset to calculate the timestamp', () => {
				(getTimeWithOffsetStub.calledWithExactly(undefined)).should.be.true();
			});

			it('should use slots.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
				const offset = -10;
				createTransaction(
					recipientId, amount, secret, null, requesterPublicKey, offset,
				);

				(getTimeWithOffsetStub.calledWithExactly(offset)).should.be.true();
			});

			describe('returned multisignature transaction', () => {
				it('should be an object', () => {
					(transactionTransaction).should.be.type('object');
				});

				it('should have type number equal to 0', () => {
					(transactionTransaction).should.have.property('type').and.be.type('number').and.equal(0);
				});

				it('should have amount number equal to 500 LSK', () => {
					(transactionTransaction).should.have.property('amount').and.be.type('number').and.equal(amount);
				});

				it('should have fee number equal to 0.1 LSK', () => {
					(transactionTransaction).should.have.property('fee').and.be.type('number').and.equal(sendFee);
				});

				it('should have recipientId string equal to 123456789L', () => {
					(transactionTransaction).should.have.property('recipientId').and.be.equal(recipientId);
				});

				it('should have senderPublicKey hex string equal to sender public key', () => {
					(transactionTransaction).should.have.property('senderPublicKey').and.be.hexString().and.equal(keys.publicKey);
				});

				it('should have requesterPublicKey hex string equal to provided requester public key', () => {
					(transactionTransaction.requesterPublicKey).should.be.equal(requesterPublicKey);
				});

				it('should have requesterPublicKey hex string equal to sender public key if requester public key is not provided', () => {
					transactionTransaction = createTransaction(recipientId, amount, secret);
					(transactionTransaction.requesterPublicKey).should.be.equal(keys.publicKey);
				});

				it('should have timestamp number equal to result of slots.getTimeWithOffset', () => {
					(transactionTransaction).should.have.property('timestamp').and.be.type('number').and.equal(timeWithOffset);
				});

				it('should have signature hex string', () => {
					(transactionTransaction).should.have.property('signature').and.be.hexString();
				});

				it('should be signed correctly', () => {
					const result = cryptoModule.verify(transactionTransaction);
					(result).should.be.ok();
				});

				it('should not be signed correctly if modified', () => {
					transactionTransaction.amount = 100;
					const result = cryptoModule.verify(transactionTransaction);
					(result).should.be.not.ok();
				});

				it('should have empty asset object', () => {
					(transactionTransaction).should.have.property('asset').and.be.type('object').and.be.empty();
				});

				it('should have id string', () => {
					(transactionTransaction).should.have.property('id').and.be.type('string');
				});

				it('should not have a second signature', () => {
					(transactionTransaction).should.not.have.property('signSignature');
				});

				it('should have an empty signatures array', () => {
					(transactionTransaction).should.have.property('signatures').and.be.an.Array().and.be.empty();
				});
			});
		});

		describe('with second secret', () => {
			beforeEach(() => {
				transactionTransaction = createTransaction(
					recipientId, amount, secret, secondSecret, requesterPublicKey,
				);
			});

			it('should create a multisignature transaction with a second secret', () => {
				const transactionTransactionWithoutSecondSecret = createTransaction(
					recipientId, amount, secret, null, requesterPublicKey,
				);
				(transactionTransaction).should.be.ok();
				(transactionTransaction)
					.should.not.be.equal(transactionTransactionWithoutSecondSecret);
			});

			describe('returned multisignature transaction', () => {
				it('should have second signature hex string', () => {
					(transactionTransaction).should.have.property('signSignature').and.be.hexString();
				});

				it('should be second signed correctly', () => {
					const result = cryptoModule
						.verifySecondSignature(transactionTransaction, secondKeys.publicKey);
					(result).should.be.ok();
				});

				it('should not be second signed correctly if modified', () => {
					transactionTransaction.amount = 100;
					const result = cryptoModule
						.verifySecondSignature(transactionTransaction, secondKeys.publicKey);
					(result).should.not.be.ok();
				});
			});
		});
	});

	describe('#signTransaction', () => {
		const { signTransaction } = multisignature;
		const transaction = {
			type: 0,
			amount: 10e8,
			fee: 0.1e8,
			recipientId: '58191285901858109L',
			timestamp: 35593081,
			asset: {},
			senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
			signature: 'cc1dc3ee73022ed7c10bdfff9183d93e71bd503e57078c32b8e6582bd13450fd9f113f95b101a568b9c757f7e739f15ed9cc77ca7dede62c61f358e30f9dc80d',
			id: '4758205935095999374',
		};
		const signature = '78a09cf9804efdae4f70d2d0ffd66aa063ebf24bd7703dab968dd5f5eeb112cc24d6d25e47d627b1f33ecdf65475cc496bd36ebd590c8216b49977670dcb8f0f';
		const length = 128; // crypto_sign_BYTES length

		let cryptoGetKeysStub;
		let cryptoMultiSignStub;
		let signedTransaction;

		beforeEach(() => {
			cryptoGetKeysStub = sinon.stub(cryptoModule, 'getKeys').returns(keys);
			cryptoMultiSignStub = sinon.stub(cryptoModule, 'multiSign').returns(signature);
			signedTransaction = signTransaction(transaction, secret);
		});

		afterEach(() => {
			cryptoGetKeysStub.restore();
			cryptoMultiSignStub.restore();
		});

		it('should return a hex string', () => {
			(signedTransaction).should.be.a.hexString();
		});

		it('should have a fixed signature length of 128 bytes', () => {
			(signedTransaction).should.have.lengthOf(length);
		});

		it('should use crypto.getKeys to get the keys for signing', () => {
			(cryptoGetKeysStub.calledWithExactly(secret)).should.be.true();
		});

		it('should use crypto.multiSign to get the signature', () => {
			(cryptoMultiSignStub.calledWithExactly(transaction, keys)).should.be.true();
		});
	});
});
