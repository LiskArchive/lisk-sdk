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
import cryptoModule from '../../src/crypto';
import { getBytes } from '../../src/transactions/transactionBytes';

describe('crypto.js', () => {
	it('should be ok', () => {
		(cryptoModule).should.be.ok();
	});

	it('should be object', () => {
		(cryptoModule).should.be.type('object');
	});

	it('should has properties', () => {
		const properties = ['getHash', 'getId', 'getFee', 'sign', 'getKeys', 'getAddress', 'verify', 'verifySecondSignature'];
		properties.forEach((property) => {
			(cryptoModule).should.have.property(property);
		});
	});

	describe('#getBytes', () => {
		let bytes = null;

		it('should be ok', () => {
			(getBytes).should.be.ok();
		});

		it('should be a function', () => {
			(getBytes).should.be.type('function');
		});

		it('should return Buffer of simply transaction and buffer most be 117 length', () => {
			const transaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				id: '13987348420913138422',
			};

			bytes = getBytes(transaction);
			(bytes).should.be.ok();
			(bytes).should.be.type('object');
			(bytes.length).should.be.equal(117);
		});

		it('should return Buffer of transaction with second signature and buffer most be 181 length', () => {
			const transaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				signSignature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				id: '13987348420913138422',
			};

			bytes = getBytes(transaction);
			(bytes).should.be.ok();
			(bytes).should.be.type('object');
			(bytes.length).should.be.equal(181);
		});
	});

	describe('#getHash', () => {
		const getHash = cryptoModule.getHash;

		it('should be ok', () => {
			(getHash).should.be.ok();
		});

		it('should be a function', () => {
			(getHash).should.be.type('function');
		});

		it('should return Buffer and Buffer most be 32 bytes length', () => {
			const transaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				id: '13987348420913138422',
			};

			const result = getHash(transaction);
			(result).should.be.ok();
			(result).should.be.type('object');
			(result.length).should.be.equal(32);
		});
	});

	describe('#getId', () => {
		const getId = cryptoModule.getId;

		it('should be ok', () => {
			(getId).should.be.ok();
		});

		it('should be a function', () => {
			(getId).should.be.type('function');
		});

		it('should return string id and be equal to 13987348420913138422', () => {
			const transaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
			};

			const id = getId(transaction);
			(id).should.be.type('string').and.equal('13987348420913138422');
		});
	});


	describe('#getKeys', () => {
		const getKeys = cryptoModule.getKeys;

		it('should be ok', () => {
			(getKeys).should.be.ok();
		});

		it('should be a function', () => {
			(getKeys).should.be.type('function');
		});

		it('should return two keys in hex', () => {
			const keys = getKeys('secret');

			(keys).should.be.ok();
			(keys).should.be.type('object');
			(keys).should.have.property('publicKey').and.be.type('string').and.be.hexString();
			(keys).should.have.property('privateKey').and.be.type('string').and.be.hexString();
		});
	});

	describe('#getAddress', () => {
		const getAddress = cryptoModule.getAddress;

		it('should be ok', () => {
			(getAddress).should.be.ok();
		});

		it('should be a function', () => {
			(getAddress).should.be.type('function');
		});

		it('should generate address by publicKey', () => {
			const keys = cryptoModule.getKeys('secret');
			const address = getAddress(keys.publicKey);

			(address).should.be.ok();
			(address).should.be.type('string');
			(address).should.be.equal('18160565574430594874L');
		});
	});

	describe('#getFee', () => {
		const getFee = cryptoModule.getFee;

		it('should be ok', () => {
			(getFee).should.be.ok();
		});

		it('should be a function', () => {
			(getFee).should.be.type('function');
		});

		it('should return number', () => {
			const fee = getFee({ amount: 100000, type: 0 });
			(fee).should.be.type('number');
			(fee).should.be.not.NaN();
		});

		it('should return 10000000', () => {
			const fee = getFee({ amount: 100000, type: 0 });
			(fee).should.be.type('number').and.equal(10000000);
		});

		it('should return 500000000', () => {
			const fee = getFee({ type: 1 });
			(fee).should.be.type('number').and.equal(500000000);
		});

		it('should be equal 2500000000', () => {
			const fee = getFee({ type: 2 });
			(fee).should.be.type('number').and.equal(2500000000);
		});

		it('should be equal 100000000', () => {
			const fee = getFee({ type: 3 });
			(fee).should.be.type('number').and.equal(100000000);
		});
	});

	describe('sign and verify @now', () => {
		const sign = cryptoModule.sign;
		const verify = cryptoModule.verify;
		const keys = cryptoModule.getKeys('123');
		const secondKeys = cryptoModule.getKeys('345');
		const expectedSignature = '05383e756598172785843f5f165a8bef3632d6a0f6b7a3429201f83e5d60a5b57faa1fa383c4f33bb85d5804848e5313aa7b0cf1058873bc8576d206bdb9c804';
		const transaction = {
			type: 0,
			amount: 1000,
			recipientId: '58191285901858109L',
			timestamp: 141738,
			asset: {},
			id: '13987348420913138422',
			senderPublicKey: keys.publicKey,
		};
		const signature = sign(transaction, keys);
		const alterTransaction = {
			type: 0,
			amount: '100',
			recipientId: '58191285901858109L',
			timestamp: 141738,
			asset: {},
			id: '13987348420913138422',
			senderPublicKey: keys.publicKey,
		};
		const alterSignature = sign(alterTransaction, keys);
		const transactionToVerify = Object.assign({}, transaction, {
			signature: sign(transaction, keys),
		});
		const transactionToSecondVerify = Object.assign({}, transactionToVerify, {
			signSignature: sign(transactionToVerify, secondKeys),
		});

		describe('#sign', () => {
			it('should be ok', () => {
				(sign).should.be.ok();
			});

			it('should be a function', () => {
				(sign).should.be.type('function');
			});

			it('should sign a transaction', () => {
				(signature).should.be.equal(expectedSignature);
			});

			it('should not be equal signing a different transaction', () => {
				(alterSignature).should.not.be.eql(signature);
			});
		});

		describe('#verify', () => {
			it('should be ok', () => {
				(verify).should.be.ok();
			});

			it('should be function', () => {
				(verify).should.be.type('function');
			});

			it('should verify a transaction', () => {
				const verification = verify(transactionToVerify);
				(verification).should.be.true();
			});
		});

		describe('#verifySecondSignature', () => {
			const verifySecondSignature = cryptoModule.verifySecondSignature;

			it('should be ok', () => {
				(verifySecondSignature).should.be.ok();
			});

			it('should be function', () => {
				(verifySecondSignature).should.be.type('function');
			});

			it('should verify a second signed transaction', () => {
				const verification = verifySecondSignature(transactionToSecondVerify, secondKeys.publicKey);
				(verification).should.be.true();
			});
		});

		describe('#multiSign', () => {
			const multiSign = cryptoModule.multiSign;

			it('should be ok', () => {
				(multiSign).should.be.ok();
			});

			it('should be function', () => {
				(multiSign).should.be.type('function');
			});

			it('should sign a multisignature transaction', () => {
				const expectedMultiSignature = '9eb6ea53f0fd5079b956625a4f1c09e3638ab3378b0e7847cfcae9dde5a67121dfc49b5e51333296002d70166d0a93d2f4b5eef9eae4e040b83251644bb49409';
				const multiSigtransaction = {
					type: 0,
					amount: 1000,
					recipientId: '58191285901858109L',
					timestamp: 141738,
					asset: {},
					senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
					signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
					id: '13987348420913138422',
				};

				const multiSignature = multiSign(multiSigtransaction, keys);

				(multiSignature).should.be.eql(expectedMultiSignature);
			});
		});
	});
});
