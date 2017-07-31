import slots from '../../src/time/slots';
import multisignature from '../../src/transactions/multisignature';
import cryptoModule from '../../src/transactions/crypto';

describe('multisignature.js', () => {
	it('should be ok', () => {
		(multisignature).should.be.ok();
	});

	it('should be an Object', () => {
		(multisignature).should.be.type('object');
	});

	it('should have function signTransaction', () => {
		(multisignature.signTransaction).should.be.type('function');
	});

	it('should have function createMultisignature', () => {
		(multisignature.createMultisignature).should.be.type('function');
	});

	describe('#createMultisignature with one secret', () => {
		const minimumSignatures = 2;
		const requestLifeTime = 5;
		const multiSignaturePublicKeyArray = ['+123456789', '-987654321'];
		const createMultisig = multisignature.createMultisignature('secret', '', multiSignaturePublicKeyArray, requestLifeTime, minimumSignatures);

		it('should create Multisignature account with single secret', () => {
			(createMultisig).should.be.ok();
			(createMultisig).should.be.type('object');
		});

		it('should be transaction type 4', () => {
			(createMultisig.type).should.be.equal(4);
		});

		it('should have no recipient', () => {
			should(createMultisig.recipientId).be.null();
		});

		it('should contain asset with multisignature and the inserted parameters', () => {
			(createMultisig.asset.multisignature.min).should.be.equal(minimumSignatures);
			(createMultisig.asset.multisignature.lifetime).should.be.equal(requestLifeTime);
			(createMultisig.asset.multisignature.keysgroup).should.be.equal(multiSignaturePublicKeyArray);
		});

		it('should not contain secondSignature', () => {
			should(createMultisig.signSignature).be.undefined();
		});
	});

	describe('#createMultisignature with two secrets', () => {
		const minimumSignatures2 = 6;
		const requestLifeTime2 = 8;
		const multiSignaturePublicKeyArray2 = ['+123456789', '+1236345489', '+123452349', '-987654321', '+12323432489', '+1234234789', '-82348375839'];
		const createMultisig2 = multisignature.createMultisignature('secret', 'secondSecret', multiSignaturePublicKeyArray2, requestLifeTime2, minimumSignatures2);

		it('should create Multisignature account with two secrets', () => {
			(createMultisig2).should.be.ok();
			(createMultisig2).should.be.type('object');
		});

		it('should be transaction type 4', () => {
			(createMultisig2.type).should.be.equal(4);
		});

		it('should have no recipient', () => {
			should(createMultisig2.recipientId).be.null();
		});

		it('should contain asset with multisignature and the inserted parameters', () => {
			(createMultisig2.asset.multisignature.min).should.be.equal(minimumSignatures2);
			(createMultisig2.asset.multisignature.lifetime).should.be.equal(requestLifeTime2);
			(createMultisig2.asset.multisignature.keysgroup)
				.should.be.equal(multiSignaturePublicKeyArray2);
		});

		it('should contain secondSignature', () => {
			(createMultisig2.signSignature).should.not.be.undefined();
		});
	});

	describe('#createMultisignature with time offset', () => {
		const minimumSignatures = 2;
		const requestLifeTime = 5;
		const multiSignaturePublicKeyArray = ['+123456789', '-987654321'];
		const now = new Date();
		let clock;

		beforeEach(() => {
			clock = sinon.useFakeTimers(now, 'Date');
		});

		afterEach(() => {
			clock.restore();
		});

		it('should use time slots to get the time for the timestamp', () => {
			const trs = multisignature.createMultisignature('secret', '', multiSignaturePublicKeyArray, requestLifeTime, minimumSignatures);

			(trs).should.have.property('timestamp').and.be.equal(slots.getTime());
		});

		it('should use time slots with an offset of -10 seconds to get the time for the timestamp', () => {
			const offset = -10;

			const trs = multisignature.createMultisignature('secret', '', multiSignaturePublicKeyArray, requestLifeTime, minimumSignatures, offset);

			(trs).should.have.property('timestamp').and.be.equal(slots.getTime() + offset);
		});
	});

	describe('#signTransaction', () => {
		const secret = '123';
		const transaction = {
			type: 0,
			amount: 1000,
			fee: 10000000,
			recipientId: '58191285901858109L',
			timestamp: 35593081,
			asset: {},
			senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
			signature: 'cc1dc3ee73022ed7c10bdfff9183d93e71bd503e57078c32b8e6582bd13450fd9f113f95b101a568b9c757f7e739f15ed9cc77ca7dede62c61f358e30f9dc80d',
			id: '4758205935095999374',
		};
		const signTransaction = multisignature.signTransaction(transaction, secret);

		it('should return an object', () => {
			(signTransaction).should.be.type('string');
		});

		it('should have a fixed signature length', () => {
			const length = 128; // crypto_sign_BYTES length

			(signTransaction).should.have.lengthOf(length);
		});
	});

	describe('#createTransaction', () => {
		const recipientId = '123456789L';
		const amount = '500';
		const secret = 'privateSecret';
		const secondSecret = 'privateSecondSecret';
		const requesterPublicKey = 'abc123';
		const msigTransaction = multisignature
			.createTransaction(recipientId, amount, secret, secondSecret, requesterPublicKey);

		it('should create a multisignature transaction', () => {
			(msigTransaction.signatures).should.be.ok();
		});

		it('should have requesterPublicKey as property', () => {
			(msigTransaction.requesterPublicKey).should.be.equal(requesterPublicKey);
		});

		it('should have the signatures property as empty array', () => {
			(msigTransaction.signatures).should.be.an.Array();
		});

		it('should create a multisignature transaction without requesterPublicKey and secondSecret', () => {
			const msigTransaction2 = multisignature.createTransaction(recipientId, amount, secret);
			const pubKey = cryptoModule.getPrivateAndPublicKeyFromSecret(secret).publicKey;

			(msigTransaction2.requesterPublicKey).should.be.equal(pubKey);
		});

		describe('with time offset', () => {
			const now = new Date();
			let clock;

			beforeEach(() => {
				clock = sinon.useFakeTimers(now, 'Date');
			});

			afterEach(() => {
				clock.restore();
			});

			it('should use time slots to get the time for the timestamp', () => {
				const trs = multisignature.createTransaction(recipientId, amount, secret, null, null);

				(trs).should.have.property('timestamp').and.be.equal(slots.getTime());
			});

			it('should use time slots with an offset of -10 seconds to get the time for the timestamp', () => {
				const offset = -10;

				const trs = multisignature
					.createTransaction(recipientId, amount, secret, null, null, offset);

				(trs).should.have.property('timestamp').and.be.equal(slots.getTime() + offset);
			});
		});
	});
});
