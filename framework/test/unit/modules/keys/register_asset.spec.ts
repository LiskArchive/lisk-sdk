/*
 * Copyright © 2020 Lisk Foundation
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
 */
import { randomBytes } from 'crypto';
import { validator } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import { getRandomBytes, hash } from '@liskhq/lisk-cryptography';
import { Transaction, transactionSchema } from '@liskhq/lisk-chain';
import { RegisterAsset } from '../../../../src/modules/keys/register_asset';
import * as fixtures from './fixtures.json';
import { keysSchema } from '../../../../src/modules/keys/schemas';
import * as testing from '../../../../src/testing';
import { KeysModule, TokenModule } from '../../../../src';

describe('register asset', () => {
	let decodedMultiSignature: any;
	let validTestTransaction: any;
	let multisignatureSender: any;
	let convertedAccount: any;
	let stateStore: any;
	let storeAccountGetStub: jest.SpyInstance;
	let storeAccountSetStub: jest.SpyInstance;
	let registerAsset: RegisterAsset;

	const defaultTestCase = fixtures.testCases[0];

	beforeEach(() => {
		registerAsset = new RegisterAsset();
		const buffer = Buffer.from(defaultTestCase.output.transaction, 'hex');
		const id = hash(buffer);
		const decodedBaseTransaction = codec.decode<Transaction>(transactionSchema, buffer);
		const decodedAsset = codec.decode<any>(registerAsset.schema, decodedBaseTransaction.asset);
		decodedMultiSignature = {
			...decodedBaseTransaction,
			asset: decodedAsset,
			id,
		};
		validTestTransaction = new Transaction(decodedMultiSignature);

		multisignatureSender = testing.fixtures.createDefaultAccount([KeysModule, TokenModule], {
			address: Buffer.from(defaultTestCase.input.account.address, 'hex'),
			token: { balance: BigInt('94378900000') },
		});

		convertedAccount = testing.fixtures.createDefaultAccount([KeysModule, TokenModule], {
			address: Buffer.from(defaultTestCase.input.account.address, 'hex'),
			token: { balance: BigInt('94378900000') },
			keys: {
				...validTestTransaction.asset,
			},
		});

		stateStore = new testing.mocks.StateStoreMock({
			accounts: [multisignatureSender],
		});

		storeAccountGetStub = jest.spyOn(stateStore.account, 'get');
		storeAccountSetStub = jest.spyOn(stateStore.account, 'set');
	});

	describe('validateSchema', () => {
		it('should fail validation if asset has numberOfSignatures > 64', () => {
			const asset = {
				numberOfSignatures: 100,
				mandatoryKeys: [getRandomBytes(32)],
				optionalKeys: [getRandomBytes(32)],
			} as any;

			const errors = validator.validate(keysSchema, asset);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('must be <= 64');
		});

		it('should fail validation if asset has numberOfSignatures < 1', () => {
			const asset = {
				numberOfSignatures: 0,
				mandatoryKeys: [getRandomBytes(32)],
				optionalKeys: [getRandomBytes(32)],
			} as any;

			const errors = validator.validate(keysSchema, asset);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('must be >= 1');
		});

		it('should fail validation if asset has more than 64 mandatory keys', () => {
			const asset = {
				numberOfSignatures: 2,
				mandatoryKeys: [...Array(65).keys()].map(() => getRandomBytes(32)),
				optionalKeys: [],
			} as any;

			const errors = validator.validate(keysSchema, asset);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('must NOT have more than 64 items');
		});

		it('should fail validation if asset mandatory keys contains items with length bigger than 32', () => {
			const asset = {
				numberOfSignatures: 2,
				mandatoryKeys: [...Array(1).keys()].map(() => getRandomBytes(64)),
				optionalKeys: [],
			} as any;

			const errors = validator.validate(keysSchema, asset);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('maxLength exceeded');
		});

		it('should fail validation if asset mandatory keys contains items with length smaller than 32', () => {
			const asset = {
				numberOfSignatures: 2,
				mandatoryKeys: [...Array(1).keys()].map(() => getRandomBytes(10)),
				optionalKeys: [],
			} as any;

			const errors = validator.validate(keysSchema, asset);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('minLength not satisfied');
		});

		it('should fail validation if asset optional keys contains items with length bigger than 32', () => {
			const asset = {
				numberOfSignatures: 2,
				mandatoryKeys: [],
				optionalKeys: [...Array(1).keys()].map(() => getRandomBytes(64)),
			} as any;

			const errors = validator.validate(keysSchema, asset);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('maxLength exceeded');
		});

		it('should fail validation if asset optional keys contains items with length smaller than 32', () => {
			const asset = {
				numberOfSignatures: 2,
				mandatoryKeys: [],
				optionalKeys: [...Array(1).keys()].map(() => getRandomBytes(31)),
			} as any;

			const errors = validator.validate(keysSchema, asset);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('minLength not satisfied');
		});

		it('should fail validation if asset has more than 64 optional keys', () => {
			const asset = {
				numberOfSignatures: 2,
				mandatoryKeys: [],
				optionalKeys: [...Array(65).keys()].map(() => getRandomBytes(32)),
			} as any;

			const errors = validator.validate(keysSchema, asset);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('must NOT have more than 64 items');
		});
	});

	describe('validate', () => {
		it('should not throw errors for valid asset', () => {
			const context = testing.createValidateAssetContext({
				asset: validTestTransaction.asset,
				transaction: validTestTransaction,
			});

			expect(() => registerAsset.validate(context)).not.toThrow();
		});

		it('should throw error when there are duplicated mandatory keys', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					mandatoryKeys: [
						...decodedMultiSignature.asset.mandatoryKeys,
						decodedMultiSignature.asset.mandatoryKeys[1],
					],
				},
			};

			const context = testing.createValidateAssetContext({
				asset: invalidTransaction.asset,
				transaction: invalidTransaction,
			});

			expect(() => registerAsset.validate(context)).toThrow(
				'MandatoryKeys contains duplicate public keys.',
			);
		});

		it('should throw error when there are duplicated optional keys', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					optionalKeys: [
						...decodedMultiSignature.asset.optionalKeys,
						decodedMultiSignature.asset.optionalKeys[1],
					],
				},
			};

			const context = testing.createValidateAssetContext({
				asset: invalidTransaction.asset,
				transaction: invalidTransaction,
			});

			expect(() => registerAsset.validate(context)).toThrow(
				'OptionalKeys contains duplicate public keys.',
			);
		});

		it('should throw error when numberOfSignatures is bigger than the count of all keys', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					numberOfSignatures: 5,
				},
			};

			const context = testing.createValidateAssetContext({
				asset: invalidTransaction.asset,
				transaction: invalidTransaction,
			});

			expect(() => registerAsset.validate(context)).toThrow(
				'The numberOfSignatures is bigger than the count of Mandatory and Optional keys.',
			);
		});

		it('should throw error when numberOfSignatures is smaller than mandatory key count', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					numberOfSignatures: 1,
				},
			};

			const context = testing.createValidateAssetContext({
				asset: invalidTransaction.asset,
				transaction: invalidTransaction,
			});

			expect(() => registerAsset.validate(context)).toThrow(
				'The numberOfSignatures needs to be equal or bigger than the number of Mandatory keys.',
			);
		});

		it('should throw error when mandatory and optional key sets are not disjointed', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					numberOfSignatures: 2,
					mandatoryKeys: [
						Buffer.from('48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371', 'hex'),
						Buffer.from('483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180', 'hex'),
					],
					optionalKeys: [
						Buffer.from('483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180', 'hex'),
					],
				},
			};

			const context = testing.createValidateAssetContext({
				asset: invalidTransaction.asset,
				transaction: invalidTransaction,
			});

			expect(() => registerAsset.validate(context)).toThrow(
				'Invalid combination of Mandatory and Optional keys. Repeated keys across Mandatory and Optional were found.',
			);
		});

		it('should throw error when mandatory keys set is not sorted', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					numberOfSignatures: 2,
					mandatoryKeys: [
						Buffer.from('48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371', 'hex'),
						Buffer.from('483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180', 'hex'),
					],
				},
			};

			const context = testing.createValidateAssetContext({
				asset: invalidTransaction.asset,
				transaction: invalidTransaction,
			});

			expect(() => registerAsset.validate(context)).toThrow(
				'Mandatory keys should be sorted lexicographically.',
			);
		});

		it('should throw error when optional keys set is not sorted', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					numberOfSignatures: 2,
					optionalKeys: [
						Buffer.from('48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371', 'hex'),
						Buffer.from('483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180', 'hex'),
					],
				},
			};

			const context = testing.createValidateAssetContext({
				asset: invalidTransaction.asset,
				transaction: invalidTransaction,
			});

			expect(() => registerAsset.validate(context)).toThrow(
				'Optional keys should be sorted lexicographically.',
			);
		});

		it('should throw error when the number of optional and mandatory keys is more than 64', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					optionalKeys: [...Array(65).keys()].map(() => randomBytes(64)),
					mandatoryKeys: [...Array(65).keys()].map(() => randomBytes(64)),
				},
			};

			const context = testing.createValidateAssetContext({
				asset: invalidTransaction.asset,
				transaction: invalidTransaction,
			});

			expect(() => registerAsset.validate(context)).toThrow(
				'The count of Mandatory and Optional keys should be between 1 and 64.',
			);
		});

		it('should throw error when the number of optional and mandatory keys is less than 1', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					optionalKeys: [],
					mandatoryKeys: [],
					numberOfSignatures: 0,
				},
			};

			const context = testing.createValidateAssetContext({
				asset: invalidTransaction.asset,
				transaction: invalidTransaction,
			});

			expect(() => registerAsset.validate(context)).toThrow(
				'The count of Mandatory and Optional keys should be between 1 and 64.',
			);
		});

		it('should return error when number of mandatory, optional and sender keys do not match the number of signatures', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
				},
				signatures: [...decodedMultiSignature.signatures],
			};
			invalidTransaction.signatures.pop();

			const context = testing.createValidateAssetContext({
				asset: invalidTransaction.asset,
				transaction: invalidTransaction,
			});

			expect(() => registerAsset.validate(context)).toThrow(
				'The number of mandatory, optional and sender keys should match the number of signatures',
			);
		});
	});

	describe('apply', () => {
		it('should not throw when registering for first time', () => {
			const context = testing.createApplyAssetContext({
				stateStore,
				asset: validTestTransaction.asset,
				transaction: validTestTransaction,
			});

			expect(async () => registerAsset.apply(context)).not.toThrow();
		});

		it('should call state store get() with senderAddress and set() with address and updated account', async () => {
			const context = testing.createApplyAssetContext({
				stateStore,
				asset: validTestTransaction.asset,
				transaction: validTestTransaction,
			});

			await registerAsset.apply(context);

			expect(storeAccountGetStub).toHaveBeenCalledWith(validTestTransaction.senderAddress);

			expect(storeAccountSetStub).toHaveBeenCalledWith(
				multisignatureSender.address,
				convertedAccount,
			);
		});

		it('should throw error when account is already multisignature', async () => {
			const context = testing.createApplyAssetContext({
				stateStore,
				asset: validTestTransaction.asset,
				transaction: validTestTransaction,
			});

			storeAccountGetStub.mockReturnValue(convertedAccount);

			return expect(registerAsset.apply(context)).rejects.toStrictEqual(
				new Error('Register multisignature only allowed once per account.'),
			);
		});
	});
});
