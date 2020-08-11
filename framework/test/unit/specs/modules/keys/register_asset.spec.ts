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
import { codec } from '@liskhq/lisk-codec';
import { hash } from '@liskhq/lisk-cryptography';
import { Transaction, transactionSchema } from './lisk_chain_transaction_tmp';
import { RegisterAsset } from '../../../../../src/modules/keys/register_asset';
import { createFakeDefaultAccount, StateStoreMock } from '../../../../utils/node';
import * as fixtures from './fixtures.json';

let decodedMultiSignature: any;
let validTestTransaction: any;
let multisignatureSender: any;
let targetMultisigAccount: any;
let convertedAccount: any;
let stateStore: any;
let storeAccountGetStub: jest.SpyInstance;
let storeAccountSetStub: jest.SpyInstance;
let registerAsset: RegisterAsset;
let reducerHandler: any;

describe('register asset module', () => {
	const defualtTestCase = fixtures.testCases[0];
	beforeEach(() => {
		registerAsset = new RegisterAsset();
		const buffer = Buffer.from(defualtTestCase.output.transaction, 'base64');
		const id = hash(buffer);
		const decodedBaseTransaction = codec.decode<Transaction>(transactionSchema, buffer);
		const decodedAsset = codec.decode<any>(registerAsset.assetSchema, decodedBaseTransaction.asset);
		decodedMultiSignature = {
			...decodedBaseTransaction,
			asset: decodedAsset,
			id,
		};
		validTestTransaction = new Transaction(decodedMultiSignature);

		multisignatureSender = createFakeDefaultAccount({
			address: Buffer.from(defualtTestCase.input.account.address, 'base64'),
		});

		targetMultisigAccount = createFakeDefaultAccount({
			address: Buffer.from(defualtTestCase.input.account.address, 'base64'),
			balance: BigInt('94378900000'),
		});
		convertedAccount = createFakeDefaultAccount({
			address: Buffer.from(defualtTestCase.input.account.address, 'base64'),
			balance: BigInt('94378900000'),
			keys: {
				...validTestTransaction.asset,
			},
		});

		stateStore = new StateStoreMock();

		storeAccountGetStub = jest.spyOn(stateStore.account, 'getOrDefault').mockResolvedValue(
			createFakeDefaultAccount({
				address: Buffer.from(defualtTestCase.input.account.address, 'base64'),
			}) as never,
		);

		storeAccountGetStub = jest
			.spyOn(stateStore.account, 'get')
			.mockResolvedValue(targetMultisigAccount);

		storeAccountSetStub = jest.spyOn(stateStore.account, 'set');

		reducerHandler = {};
	});

	describe('validateAsset', () => {
		it('should not throw errors for valid asset', () => {
			expect(() =>
				registerAsset.validateAsset({
					asset: validTestTransaction.asset,
					transaction: validTestTransaction,
				}),
			).not.toThrow();
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

			expect(() =>
				registerAsset.validateAsset({
					asset: invalidTransaction.asset,
					transaction: invalidTransaction,
				}),
			).toThrow('MandatoryKeys contains duplicate public keys.');
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

			expect(() =>
				registerAsset.validateAsset({
					asset: invalidTransaction.asset,
					transaction: invalidTransaction,
				}),
			).toThrow('OptionalKeys contains duplicate public keys.');
		});

		it('should throw error when numberOfSignatures is bigger than the count of all keys', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					numberOfSignatures: 5,
				},
			};

			expect(() =>
				registerAsset.validateAsset({
					asset: invalidTransaction.asset,
					transaction: invalidTransaction,
				}),
			).toThrow('The numberOfSignatures is bigger than the count of Mandatory and Optional keys.');
		});

		it('should throw error when numberOfSignatures is smaller than mandatory key count', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					numberOfSignatures: 1,
				},
			};

			expect(() =>
				registerAsset.validateAsset({
					asset: invalidTransaction.asset,
					transaction: invalidTransaction,
				}),
			).toThrow(
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

			expect(() =>
				registerAsset.validateAsset({
					asset: invalidTransaction.asset,
					transaction: invalidTransaction,
				}),
			).toThrow(
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

			expect(() =>
				registerAsset.validateAsset({
					asset: invalidTransaction.asset,
					transaction: invalidTransaction,
				}),
			).toThrow('Mandatory keys should be sorted lexicographically.');
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

			expect(() =>
				registerAsset.validateAsset({
					asset: invalidTransaction.asset,
					transaction: invalidTransaction,
				}),
			).toThrow('Optional keys should be sorted lexicographically.');
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

			expect(() =>
				registerAsset.validateAsset({
					asset: invalidTransaction.asset,
					transaction: invalidTransaction,
				}),
			).toThrow('The count of Mandatory and Optional keys should be between 1 and 64.');
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

			expect(() =>
				registerAsset.validateAsset({
					asset: invalidTransaction.asset,
					transaction: invalidTransaction,
				}),
			).toThrow('The count of Mandatory and Optional keys should be between 1 and 64.');
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

			expect(() =>
				registerAsset.validateAsset({
					asset: invalidTransaction.asset,
					transaction: invalidTransaction,
				}),
			).toThrow(
				'The number of mandatory, optional and sender keys should match the number of signatures',
			);
		});
	});

	describe('applyAsset', () => {
		beforeEach(() => {
			storeAccountGetStub.mockReturnValue(targetMultisigAccount);
		});

		it('should not throw when registering for first time', () => {
			expect(async () =>
				registerAsset.applyAsset({
					stateStore,
					asset: validTestTransaction.asset,
					senderID: validTestTransaction.address,
					reducerHandler,
					transaction: validTestTransaction,
				}),
			).not.toThrow();
		});

		it('should call state store get() with senderID and set() with adress and updated account', async () => {
			await registerAsset.applyAsset({
				stateStore,
				asset: validTestTransaction.asset,
				senderID: validTestTransaction.address,
				reducerHandler,
				transaction: validTestTransaction,
			});

			expect(storeAccountGetStub).toHaveBeenCalledWith(validTestTransaction.senderId);

			expect(storeAccountSetStub).toHaveBeenCalledWith(
				multisignatureSender.address,
				convertedAccount,
			);
		});

		it('should throw error when account is already multisignature', async () => {
			storeAccountGetStub.mockReturnValue(convertedAccount);

			return expect(
				registerAsset.applyAsset({
					stateStore,
					asset: validTestTransaction.asset,
					senderID: validTestTransaction.address,
					reducerHandler,
					transaction: validTestTransaction,
				}),
			).rejects.toStrictEqual(new Error('Register multisignature only allowed once per account.'));
		});
	});
});
