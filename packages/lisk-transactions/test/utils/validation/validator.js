/*
 * Copyright © 2018 Lisk Foundation
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

import { validateTransaction } from '../../../src/utils/validation/validator';

describe('validator', () => {
	let validTransaction;

	describe('when the input is empty', () => {
		it('should throw an error', () => {
			return expect(validateTransaction.bind(null)).to.throw();
		});
	});

	describe('when the input does not have correct type', () => {
		it('should throw an error when the type is not a number', () => {
			return expect(
				validateTransaction.bind(null, { type: 'newtype' }),
			).to.throw('Unsupported transaction type.');
		});

		it('should throw an error when the type is not supported', () => {
			return expect(validateTransaction.bind(null, { type: 8 })).to.throw(
				'Unsupported transaction type.',
			);
		});
	});

	describe('transaction type 0 with common keys', () => {
		beforeEach(() => {
			validTransaction = {
				amount: '10000000000',
				recipientId: '123L',
				senderPublicKey:
					'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd',
				timestamp: 68223825,
				type: 0,
				fee: '10000000',
				recipientPublicKey: null,
				asset: {},
				signature:
					'fad7b3b31c337b39190d206831c1eaadc6bbf3878a3507a868a5fbb03471b383042bf3bb7cee20d9844f2f4d1bb90d08bc3589b8b7d27a538be285deec7a9504',
				id: '13241881933583824171',
			};
			return Promise.resolve();
		});

		it('should validate to be true without errors', () => {
			const { valid, errors } = validateTransaction(validTransaction);
			expect(errors).to.be.null;
			return expect(valid).to.be.true;
		});

		it('should validate to be false with errors when id contains non-number', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				id: '123nonnumber',
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.id');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when id contains more than 20 digits', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				id: '123456789012345678901',
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.id');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when id is too large', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				id: '18446744073709551616',
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.id');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when amount is not number', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				amount: 'some number',
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.amount');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when amount is greater than maximum possible', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				amount: '18446744073709551616',
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.amount');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when timestamp does not exist', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				timestamp: undefined,
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].params.missingProperty).to.equal('timestamp');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when timestamp is not integer', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				timestamp: 12.34,
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.timestamp');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when timestamp is negative integer', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				timestamp: -12,
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.timestamp');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when timestamp is too large', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				timestamp: 2147483648,
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.timestamp');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when senderId is not valid address', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				senderId: 'Invalid Address',
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.senderId');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when senderPublicKey does not exist', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				senderPublicKey: undefined,
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].params.missingProperty).to.equal('senderPublicKey');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when senderPublicKey is not valid public key', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				senderPublicKey:
					'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffezzzzzzzzzzzzz',
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.senderPublicKey');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when senderSecondPublicKey is not valid public key', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				senderSecondPublicKey:
					'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffezzzzzzzzzzzzz',
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.senderSecondPublicKey');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when recipientId does not exist', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				recipientId: undefined,
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].params.missingProperty).to.equal('recipientId');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when recipientId is not valid address', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				recipientId: '1234567891011121314151617181920L',
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.recipientId');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when recipientPublicKey is not valid publicKey', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				recipientPublicKey:
					'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffezzzzzzzzzzzzz',
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.recipientPublicKey');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when signature does not exist', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				signature: undefined,
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].params.missingProperty).to.equal('signature');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when signature is not valid signature', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				signature: 'signature',
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.signature');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when signSignature is not valid signature', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				signSignature: 'signature',
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.signSignature');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when signatures is not an array', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				signatures: 'signature',
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.signatures');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when signatures contain duplicate elements', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				signatures: [
					'fad7b3b31c337b39190d206831c1eaadc6bbf3878a3507a868a5fbb03471b383042bf3bb7cee20d9844f2f4d1bb90d08bc3589b8b7d27a538be285deec7a9504',
					'fad7b3b31c337b39190d206831c1eaadc6bbf3878a3507a868a5fbb03471b383042bf3bb7cee20d9844f2f4d1bb90d08bc3589b8b7d27a538be285deec7a9504',
				],
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.signatures');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when signatures contain an invalid signature', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				signatures: [
					'fad7b3b31c337b39190d206831c1eaadc6bbf3878a3507a868a5fbb03471b383042bf3bb7cee20d9844f2f4d1bb90d08bc3589b8b7d27a538be285deec7a9504',
					'zzzzzzzzzzzzzzzzzzzzzz6831c1eaadc6bbf3878a3507a868a5fbb03471b383042bf3bb7cee20d9844f2f4d1bb90d08bc3589b8b7d27a538be285deec7a9504',
				],
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.signatures[1]');
			return expect(valid).to.be.false;
		});

		it('should validate to be true when signatures contains only non-duplicated valid signatures', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				signatures: [
					'fad7b3b31c337b39190d206831c1eaadc6bbf3878a3507a868a5fbb03471b383042bf3bb7cee20d9844f2f4d1bb90d08bc3589b8b7d27a538be285deec7a9504',
					'aaaab3b31c337b39190d206831c1eaadc6bbf3878a3507a868a5fbb03471b383042bf3bb7cee20d9844f2f4d1bb90d08bc3589b8b7d27a538be285deec7a9504',
				],
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors).to.be.null;
			return expect(valid).to.be.true;
		});

		it('should validate to be true when data is 64 bytes', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					data: 'f---b3b31c337b39190d206.......czzzzzzzzzzzzzzzzzzzzzz',
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors).to.null;
			return expect(valid).to.be.true;
		});

		it('should validate to be false with errors when data is greater than 64 bytes', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					data:
						'fad7b3b31c337b39190d206831c1eaadfad7b3b31c337b39190d206831c1eaad+',
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.data');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors with empty object with only type 0', () => {
			const { valid, errors } = validateTransaction({ type: 0 });
			expect(errors).to.have.length(8);
			errors.forEach(err => expect(err.params.missingProperty).not.to.be.empty);
			return expect(valid).to.be.false;
		});
	});

	describe('transaction type 1', () => {
		beforeEach(() => {
			validTransaction = {
				amount: '0',
				recipientId: '',
				senderPublicKey:
					'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd',
				timestamp: 68247466,
				type: 1,
				fee: '500000000',
				asset: {
					signature: {
						publicKey:
							'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd',
					},
				},
				signature:
					'98b0dbd77efadaee7112915fd4a08551a594460f1d30f0ead7efb328ff60521a5d88c7f8eaf700f2d91c86228a41eacf34729268269dee5d74dd61ed1a79d40b',
				id: '9795926042598492108',
			};
			return Promise.resolve();
		});

		it('should validate to be true without errors', () => {
			const { valid, errors } = validateTransaction(validTransaction);
			expect(errors).to.be.null;
			return expect(valid).to.be.true;
		});

		it('should validate to be false with errors when asset.signature does not exist', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					signature: undefined,
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].params.missingProperty).to.equal('signature');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.signature.publicKey does not exist', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					signature: {
						publicKey: undefined,
					},
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].params.missingProperty).to.equal('publicKey');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.signature.publicKey is not valid public key', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					signature: {
						publicKey:
							'a4465fd76c16fcc458448076372abf1912zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
					},
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.signature.publicKey');
			return expect(valid).to.be.false;
		});
	});

	describe('transaction type 2', () => {
		beforeEach(() => {
			validTransaction = {
				amount: '0',
				recipientId: '',
				senderPublicKey:
					'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd',
				timestamp: 68248944,
				type: 2,
				fee: '2500000000',
				asset: {
					delegate: {
						username: 'username',
					},
				},
				signature:
					'0ea67e681b3c68725b78c4079888aecf2bab3aa2d36597d277ecb7ca9f1167764862f112e2d07e5b8ad42a9197345f168e26d9e0da1adabf436a5ad6a003480f',
				id: '13714796095941628325',
			};
			return Promise.resolve();
		});

		it('should validate to be true without errors', () => {
			const { valid, errors } = validateTransaction(validTransaction);
			expect(errors).to.be.null;
			return expect(valid).to.be.true;
		});

		it('should validate to be false with errors when asset.delegate does not exist', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					delegate: undefined,
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].params.missingProperty).to.equal('delegate');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.delegate.username does not exist', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					delegate: {
						username: undefined,
					},
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].params.missingProperty).to.equal('username');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.delegate.username is over 20 bytes', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					delegate: {
						username: 'abcdefghihkabcdefghih',
					},
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.delegate.username');
			return expect(valid).to.be.false;
		});
	});

	describe('transaction type 3', () => {
		beforeEach(() => {
			validTransaction = {
				amount: '0',
				recipientId: '12475940823804898745L',
				senderPublicKey:
					'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd',
				timestamp: 68249271,
				type: 3,
				fee: '100000000',
				asset: {
					votes: [
						'+215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
						'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
						'-e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba',
					],
				},
				signature:
					'8a4560fefab2bc9cbefa5429b2579889b0b8ee3c8818b6903a21fdf1bb60b71c680c8519ccfd40ebf076f30265cf89da0d9133b1f19beb8c79bb516da4666b00',
				id: '6349709576366289404',
			};
			return Promise.resolve();
		});

		it('should validate to be true without errors', () => {
			const { valid, errors } = validateTransaction(validTransaction);
			expect(errors).to.be.null;
			return expect(valid).to.be.true;
		});

		it('should validate to be false with errors when asset.votes does not exist', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					votes: undefined,
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].params.missingProperty).to.equal('votes');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.votes is not an array', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					votes: {},
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.votes');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.votes is an empty array', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					votes: [],
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.votes');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.votes has more than 33 elements', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					votes: [
						'+215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
						'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
						'-e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccbb',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccbc',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccbd',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccbe',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccbf',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccb1',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccb2',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccb3',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccb4',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccb5',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccb6',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccb7',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccb8',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccb9',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084cc1a',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084cc2a',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084cc3a',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084cc4a',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084cc5a',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084cc6a',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084cc7a',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084cc8a',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084cc9a',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccaa',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccca',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccda',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccea',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccfa',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084c1ba',
						'-ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084c2ba',
					],
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.votes');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.votes has duplicate elements', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					votes: [
						'+215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
						'+215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
					],
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.votes');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.votes has duplicate elements with different actions', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					votes: [
						'+215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
						'-215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
					],
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.votes');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when a public key in asset.votes has no sign', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					votes: [
						'+215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
						'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
					],
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.votes[1]');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.votes has invalid public key', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					votes: [
						'+randome',
						'-215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
					],
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.votes[0]');
			return expect(valid).to.be.false;
		});
	});

	describe('transaction type 4', () => {
		beforeEach(() => {
			validTransaction = {
				amount: '0',
				recipientId: '',
				senderPublicKey:
					'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd',
				timestamp: 68249989,
				type: 4,
				fee: '1500000000',
				asset: {
					multisignature: {
						min: 2,
						lifetime: 24,
						keysgroup: [
							'+215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
						],
					},
				},
				signature:
					'b26ce1001190dcad87b80056ce713bbb8c9f3fbeb412b4f04c9c571d31ae7b4f02ad9952f6295f7cfeb625156ec1d29ae9ebf0455907126a16bc61a413b1260f',
				id: '13972075266355782406',
			};
			return Promise.resolve();
		});

		it('should validate to be true without errors', () => {
			const { valid, errors } = validateTransaction(validTransaction);
			expect(errors).to.be.null;
			return expect(valid).to.be.true;
		});

		it('should validate to be false with errors when asset.multisignature does not exist', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					multisignature: undefined,
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].params.missingProperty).to.equal('multisignature');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.multisignature.min does not exist', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					multisignature: Object.assign(
						{},
						validTransaction.asset.multisignature,
						{
							min: undefined,
						},
					),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].params.missingProperty).to.equal('min');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.multisignature.min is zero', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					multisignature: Object.assign(
						{},
						validTransaction.asset.multisignature,
						{
							min: 0,
						},
					),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.multisignature.min');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.multisignature.min is too large', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					multisignature: Object.assign(
						{},
						validTransaction.asset.multisignature,
						{
							min: 17,
						},
					),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.multisignature.min');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.multisignature.lifetime does not exist', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					multisignature: Object.assign(
						{},
						validTransaction.asset.multisignature,
						{
							lifetime: undefined,
						},
					),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].params.missingProperty).to.equal('lifetime');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.multisignature.lifetime is zero', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					multisignature: Object.assign(
						{},
						validTransaction.asset.multisignature,
						{
							lifetime: 0,
						},
					),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.multisignature.lifetime');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.multisignature.lifetime is more than 24', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					multisignature: Object.assign(
						{},
						validTransaction.asset.multisignature,
						{
							lifetime: 25,
						},
					),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.multisignature.lifetime');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.multisignature.keysgroup does not exist', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					multisignature: Object.assign(
						{},
						validTransaction.asset.multisignature,
						{
							keysgroup: undefined,
						},
					),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].params.missingProperty).to.equal('keysgroup');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.multisignature.keysgroup is an empty array', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					multisignature: Object.assign(
						{},
						validTransaction.asset.multisignature,
						{
							keysgroup: [],
						},
					),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.multisignature.keysgroup');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.multisignature.keysgroup has only one element', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					multisignature: Object.assign(
						{},
						validTransaction.asset.multisignature,
						{
							keysgroup: [
								'+215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
							],
						},
					),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.multisignature.keysgroup');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.multisignature.keysgroup has duplicate elements', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					multisignature: Object.assign(
						{},
						validTransaction.asset.multisignature,
						{
							keysgroup: [
								'+215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
								'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
								'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
							],
						},
					),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.multisignature.keysgroup');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.multisignature.keysgroup has a public key with no sign', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					multisignature: Object.assign(
						{},
						validTransaction.asset.multisignature,
						{
							keysgroup: [
								'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
								'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
								'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
							],
						},
					),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.multisignature.keysgroup[0]');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.multisignature.keysgroup has "-" sign key', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					multisignature: Object.assign(
						{},
						validTransaction.asset.multisignature,
						{
							keysgroup: [
								'-215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
								'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
								'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
							],
						},
					),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.multisignature.keysgroup[0]');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.multisignature.keysgroup has invalid public key', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					multisignature: {
						min: 2,
						lifetime: 24,
						keysgroup: [
							'+not public key',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
						],
					},
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.multisignature.keysgroup[0]');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.multisignature.keysgroup has more than 16 elements', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					multisignature: {
						min: 2,
						lifetime: 24,
						keysgroup: [
							'+215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1ab',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1ac',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1ad',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1ae',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1af',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1a1',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1a2',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1a3',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1a4',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1a5',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1a6',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1a7',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1a8',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1a9',
							'+922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a11a',
						],
					},
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.multisignature.keysgroup');
			return expect(valid).to.be.false;
		});
	});

	describe('transaction type 5', () => {
		beforeEach(() => {
			validTransaction = {
				type: 5,
				amount: '0',
				fee: '2500000000',
				recipientId: '',
				senderPublicKey:
					'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
				timestamp: 54196080,
				asset: {
					dapp: {
						category: 0,
						name: 'OpwYfwHdAfO4ncn7D',
						description: 'Ds',
						tags: '1nkfYVcgsisKnXyn7k0',
						type: 0,
						link: 'WQDusb0DgH',
						icon: 'RPAFQsBIsE',
					},
				},
				signature:
					'524afb27d284e4e71ea44de9d23f9a1cd603f37f81a55187a61ca92391dce1994d2c4a5e3f0ae8490caac66da5125a0d03f30d0775592aa02d451a72e3ed9303',
				id: '7976119586785833934',
			};
			return Promise.resolve();
		});

		it('should validate to be true without errors', () => {
			const { valid, errors } = validateTransaction(validTransaction);
			expect(errors).to.be.null;
			return expect(valid).to.be.true;
		});

		it('should validate to be false with errors when asset.dapp does not exist', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					dapp: undefined,
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].params.missingProperty).to.equal('dapp');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.dapp is empty object', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					dapp: {},
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors).to.have.length(4);
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.dapp.name is not string', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					dapp: Object.assign({}, validTransaction.asset.dapp, {
						name: 3,
					}),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.dapp.name');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.dapp.type is not integer', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					dapp: Object.assign({}, validTransaction.asset.dapp, {
						type: 1.2,
					}),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.dapp.type');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.dapp.link is not string', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					dapp: Object.assign({}, validTransaction.asset.dapp, {
						link: 3,
					}),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.dapp.link');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.dapp.category is not integer', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					dapp: Object.assign({}, validTransaction.asset.dapp, {
						category: 'category 1',
					}),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.dapp.category');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.dapp.tags is not string', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					dapp: Object.assign({}, validTransaction.asset.dapp, {
						tags: 3,
					}),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.dapp.tags');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.dapp.description is not string', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					dapp: Object.assign({}, validTransaction.asset.dapp, {
						description: 3,
					}),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.dapp.description');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when asset.dapp.icon is not string', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					dapp: Object.assign({}, validTransaction.asset.dapp, {
						icon: 3,
					}),
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.dapp.icon');
			return expect(valid).to.be.false;
		});
	});
});
