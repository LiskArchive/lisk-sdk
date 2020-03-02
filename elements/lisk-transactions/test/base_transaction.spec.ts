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
import * as cryptography from '@liskhq/lisk-cryptography';
import { BYTESIZES, MAX_TRANSACTION_AMOUNT } from '../src/constants';
import { BaseTransaction } from '../src/base_transaction';
import {
	TransactionJSON,
	Status,
	TransactionError,
	TransferTransaction,
} from '../src';
import {
	addTransactionFields,
	TestTransaction,
	TestTransactionBasicImpl,
} from './helpers';
import * as transferFixture from '../fixtures/transaction_network_id_and_change_order/transfer_transaction_validate.json';
import * as multisignatureFixture from '../fixtures/transaction_network_id_and_change_order/transfer_transaction_with_multi_signature_validate.json';
import * as utils from '../src/utils';
import { defaultAccount, StateStoreMock } from './utils/state_store_mock';

const getAccount = (account: object): any => ({
	balance: 0,
	producedBlocks: 0,
	missedBlocks: 0,
	...account,
	keys: {
		mandatoryKeys: [],
		optionalKeys: [],
		numberOfSignatures: 0,
	},
});

describe('Base transaction class', () => {
	const defaultTransaction = addTransactionFields(
		transferFixture.testCases[0].output,
	);

	const defaultSenderAccount = getAccount({
		...transferFixture.testCases[0].input.account,
		balance: BigInt('1000000000000'),
	});

	const defaultMultisignatureTransaction = addTransactionFields(
		multisignatureFixture.testCases[0].output,
	);

	const networkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

	let validTestTransaction: BaseTransaction;
	let transactionWithDefaultValues: BaseTransaction;
	let transactionWithBasicImpl: BaseTransaction;
	let validMultisignatureTransaction: TransferTransaction;
	let store: StateStoreMock;

	beforeEach(async () => {
		validTestTransaction = new TransferTransaction({
			...defaultTransaction,
			networkIdentifier,
		});
		transactionWithDefaultValues = new TransferTransaction({
			networkIdentifier,
		});
		transactionWithBasicImpl = new TestTransactionBasicImpl({
			networkIdentifier,
			nonce: '1',
			fee: '1000000',
		});
		validMultisignatureTransaction = new TransferTransaction({
			...defaultMultisignatureTransaction,
			networkIdentifier,
		});
		store = new StateStoreMock([defaultSenderAccount]);
	});

	describe('#constructor', () => {
		it('should create a new instance of BaseTransaction', async () => {
			expect(validTestTransaction).toBeInstanceOf(BaseTransaction);
		});

		it('should set default values', async () => {
			expect(transactionWithDefaultValues.type).toEqual(8);
			expect(transactionWithDefaultValues.confirmations).toBeUndefined();
			expect(transactionWithDefaultValues.blockId).toBeUndefined();
			expect(transactionWithDefaultValues.height).toBeUndefined();
			expect(transactionWithDefaultValues.receivedAt).toBeUndefined();
			expect(transactionWithDefaultValues.signSignature).toBeUndefined();
			expect(() => transactionWithDefaultValues.senderId).toThrowError(
				'senderPublicKey is required to be set before use',
			);
			expect(() => transactionWithDefaultValues.senderPublicKey).toThrowError(
				'senderPublicKey is required to be set before use',
			);
			expect(() => transactionWithDefaultValues.signature).toThrowError(
				'signature is required to be set before use',
			);
		});

		it('should have fee of type bigint', async () => {
			expect(typeof validTestTransaction.fee).toBe('bigint');
		});

		it('should have nonce of type bigint', async () => {
			expect(typeof validTestTransaction.nonce).toBe('bigint');
		});

		it('should have id string', async () => {
			expect(validTestTransaction.id).toBeString();
		});

		it('should have senderPublicKey string', async () => {
			expect(validTestTransaction.senderPublicKey).toBeString();
		});

		it('should have signature string', async () => {
			expect(validTestTransaction.senderPublicKey).toBeString();
		});

		it('should have signSignature string', async () => {
			expect(validTestTransaction.signSignature).toBeUndefined();
		});

		it('should have signatures array', async () => {
			expect(validTestTransaction.signatures).toBeArray();
		});

		it('should have type number', async () => {
			expect(validTestTransaction.type).toBeNumber();
		});

		it('should have receivedAt Date', async () => {
			expect(validTestTransaction.receivedAt).toBeInstanceOf(Date);
		});

		it('should have _multisignatureStatus number', async () => {
			expect((validTestTransaction as any)._multisignatureStatus).toBeNumber();
		});

		it('should have _networkIdentifier string', async () => {
			expect((validTestTransaction as any)._networkIdentifier).toBeString();
		});

		it('should not throw with undefined input', async () => {
			expect(() => new TestTransaction(undefined as any)).not.toThrowError();
		});

		it('should not throw with null input', async () => {
			expect(() => new TestTransaction(null as any)).not.toThrowError();
		});

		it('should not throw with string input', async () => {
			expect(() => new TestTransaction('abc' as any)).not.toThrowError();
		});

		it('should not throw with number input', async () => {
			expect(() => new TestTransaction(123 as any)).not.toThrowError();
		});

		it('should not throw with incorrectly typed transaction properties', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				amount: 0,
				fee: 10,
			};
			expect(
				() =>
					new TestTransaction(
						(invalidTransaction as unknown) as TransactionJSON,
					),
			).not.toThrowError();
		});
	});

	describe('#assetToJSON', () => {
		it('should return an object of type transaction asset', async () => {
			expect(validTestTransaction.assetToJSON()).toBeObject();
		});
	});

	describe('#toJSON', () => {
		it('should call assetToJSON', async () => {
			const assetToJSONStub = jest
				.spyOn(validTestTransaction, 'assetToJSON')
				.mockReturnValue({});
			validTestTransaction.toJSON();

			expect(assetToJSONStub).toHaveBeenCalledTimes(1);
		});

		it('should return transaction json', async () => {
			const transactionJSON = validTestTransaction.toJSON();

			expect(transactionJSON).toEqual({
				...defaultTransaction,
				senderId: '2129300327344985743L',
			});
		});
	});

	describe('#assetToBytes', () => {
		it('should return a buffer', async () => {
			expect(
				(validTestTransaction as TestTransaction).assetToBytes(),
			).toBeInstanceOf(Buffer);
		});
	});

	describe('#stringify', () => {
		it('should return the transaction stringified', async () => {
			expect(typeof (validTestTransaction as TestTransaction).stringify()).toBe(
				'string',
			);
		});
	});

	describe('#isReady', () => {
		it('should return false on initialization of unknown transaction', async () => {
			expect(validTestTransaction.isReady()).toBe(false);
		});

		it('should return true on verification of non-multisignature transaction', async () => {
			await validTestTransaction.apply(store);
			expect(validTestTransaction.isReady()).toBe(true);
		});

		it('should return false on verification of multisignature transaction with missing signatures', async () => {
			const multisignaturesTransaction = new TransferTransaction({
				...defaultMultisignatureTransaction,
				networkIdentifier,
				signatures: defaultMultisignatureTransaction.signatures.slice(0, 2),
			});
			multisignaturesTransaction.apply(store);

			expect(validMultisignatureTransaction.isReady()).toBe(false);
		});
	});

	describe('#getBasicBytes', () => {
		it('should call cryptography hexToBuffer', async () => {
			const cryptographyHexToBufferStub = jest
				.spyOn(cryptography, 'hexToBuffer')
				.mockReturnValue(
					Buffer.from(validTestTransaction.senderPublicKey, 'hex'),
				);

			(validTestTransaction as any).getBasicBytes();
			expect(cryptographyHexToBufferStub).toHaveBeenCalledWith(
				defaultTransaction.senderPublicKey,
			);
		});

		it('should call assetToBytes for transaction with asset', async () => {
			const transactionWithAsset = {
				...defaultTransaction,
				asset: { amount: '1000', data: 'data', recipientId: '1L' },
			};
			const testTransactionWithAsset = new TestTransaction(
				transactionWithAsset,
			);
			const assetToBytesStub = jest.spyOn(
				testTransactionWithAsset,
				'assetToBytes',
			);
			(testTransactionWithAsset as any).getBasicBytes();

			expect(assetToBytesStub).toHaveBeenCalledTimes(1);
		});

		it('should return a buffer with correct bytes', async () => {
			const expectedBuffer = Buffer.concat([
				Buffer.alloc(BYTESIZES.TYPE, validTestTransaction.type),
				cryptography.intToBuffer(
					validTestTransaction.nonce.toString(),
					BYTESIZES.NONCE,
				),
				cryptography.hexToBuffer(validTestTransaction.senderPublicKey),
				cryptography.intToBuffer(
					validTestTransaction.fee.toString(),
					BYTESIZES.FEE,
				),
				(validTestTransaction as any).assetToBytes(),
			]);
			expect((validTestTransaction as any).getBasicBytes()).toEqual(
				expectedBuffer,
			);
		});
	});

	describe('#getBytes', () => {
		it('should call getBasicBytes', async () => {
			const getBasicBytesStub = jest
				.spyOn(validTestTransaction as any, 'getBasicBytes')
				.mockReturnValue(
					Buffer.from(
						'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c679324300000000000000000000000000000000',
						'hex',
					),
				);
			validTestTransaction.getBytes();

			expect(getBasicBytesStub).toHaveBeenCalledTimes(1);
		});

		it('should call cryptography hexToBuffer for transaction with signature', async () => {
			const cryptographyHexToBufferStub = jest
				.spyOn(cryptography, 'hexToBuffer')
				.mockReturnValue(
					Buffer.from(
						'2092abc5dd72d42b289f69ddfa85d0145d0bfc19a0415be4496c189e5fdd5eff02f57849f484192b7d34b1671c17e5c22ce76479b411cad83681132f53d7b309',
						'hex',
					),
				);
			validTestTransaction.getBytes();

			expect(cryptographyHexToBufferStub).toHaveBeenCalledWith(
				validTestTransaction.signature,
			);
		});

		it('should return a buffer with signature bytes', async () => {
			const expectedBuffer = Buffer.concat([
				(validTestTransaction as any).getBasicBytes(),
				cryptography.hexToBuffer((validTestTransaction as any)._signature),
			]);

			expect(validTestTransaction.getBytes()).toEqual(expectedBuffer);
		});
	});

	describe('_validateSchema', () => {
		it('should call toJSON', async () => {
			const toJSONStub = jest
				.spyOn(validTestTransaction, 'toJSON')
				.mockReturnValue({} as any);
			(validTestTransaction as any)._validateSchema();

			expect(toJSONStub).toHaveBeenCalledTimes(1);
		});

		it('should call cryptography getAddressFromPublicKey for transaction with valid senderPublicKey', async () => {
			jest
				.spyOn(cryptography, 'getAddressFromPublicKey')
				.mockReturnValue('18278674964748191682L');
			(validTestTransaction as any)._validateSchema();

			expect(cryptography.getAddressFromPublicKey).toHaveBeenCalledWith(
				validTestTransaction.senderPublicKey,
			);
		});

		it('should return a successful transaction response with a valid transaction', async () => {
			const errors = (validTestTransaction as any)._validateSchema();
			expect(Object.keys(errors)).toHaveLength(0);
		});

		it('should return a failed transaction response with invalid formatting', async () => {
			const invalidTransaction = {
				type: 0,
				senderPublicKey: '11111111',
				timestamp: 79289378,
				asset: {},
				signature: '1111111111',
				id: '1',
			};
			const invalidTestTransaction = new TestTransaction(
				invalidTransaction as any,
			);
			const errors = (invalidTestTransaction as any)._validateSchema();

			expect(Object.keys(errors)).not.toHaveLength(0);
		});

		it('should throw descriptive error when networkIdentifier is missing', async () => {
			const transactionWithMissingNetworkIdentifier = {
				...transferFixture.testCases[0].input.transaction,
			};

			const transactionWithMissingNetworkIdentifierInstance = new TestTransaction(
				transactionWithMissingNetworkIdentifier as any,
			);

			expect(() =>
				transactionWithMissingNetworkIdentifierInstance.sign(
					transferFixture.testCases[0].input.account.passphrase,
				),
			).toThrowError('Network identifier is required to sign a transaction');
		});
	});

	describe('#validate', () => {
		// TODO: undo skip, as this test transaction is no longer valid signature
		// It does not include the amount and recipient
		it('should return a successful transaction response with a valid transaction', async () => {
			const { id, status, errors } = validTestTransaction.validate();

			expect(id).toEqual(validTestTransaction.id);
			expect(Object.keys(errors)).toHaveLength(0);
			expect(status).toEqual(Status.OK);
		});

		it('should return a successful transaction response with a valid transaction with basic impl', async () => {
			transactionWithBasicImpl.sign('passphrase');
			const { id, status, errors } = transactionWithBasicImpl.validate();

			expect(id).toEqual(transactionWithBasicImpl.id);
			expect(Object.keys(errors)).toHaveLength(0);
			expect(status).toEqual(Status.OK);
		});

		it('should call getBasicBytes', async () => {
			const getBasicBytesStub = jest
				.spyOn(validTestTransaction as any, 'getBasicBytes')
				.mockReturnValue(
					Buffer.from(
						'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c679324300000000000000000000000000000000',
						'hex',
					),
				);
			validTestTransaction.validate();

			expect(getBasicBytesStub).toHaveBeenCalledTimes(3);
		});

		it('should call validateSignature', async () => {
			jest.spyOn(utils, 'validateSignature').mockReturnValue({ valid: true });
			validTestTransaction.validate();

			expect(utils.validateSignature).toHaveBeenCalledWith(
				validTestTransaction.senderPublicKey,
				validTestTransaction.signature,
				Buffer.concat([
					Buffer.from(networkIdentifier, 'hex'),
					(validTestTransaction as any).getBasicBytes(),
				]),
				validTestTransaction.id,
			);
		});

		it('should return a failed transaction response with invalid signature', async () => {
			const invalidSignature = defaultTransaction.signature.replace('1', '0');
			const invalidSignatureTransaction = {
				...defaultTransaction,
				signature: invalidSignature,
			};
			const invalidSignatureTestTransaction = new TestTransaction({
				...(invalidSignatureTransaction as any),
				networkIdentifier,
			});
			jest
				.spyOn(invalidSignatureTestTransaction as any, '_validateSchema')
				.mockReturnValue([]);
			const { id, status, errors } = invalidSignatureTestTransaction.validate();

			expect(id).toEqual(invalidSignatureTestTransaction.id);
			expect((errors as ReadonlyArray<TransactionError>)[0]).toBeInstanceOf(
				TransactionError,
			);
			expect((errors as ReadonlyArray<TransactionError>)[0].message).toContain(
				`Failed to validate signature ${invalidSignature}`,
			);
			expect(status).toEqual(Status.FAIL);
		});

		it('should return a failed transaction response with duplicate signatures', async () => {
			const invalidSignaturesTransaction = {
				...defaultTransaction,
				signatures: [
					defaultTransaction.signature,
					defaultTransaction.signature,
				],
			};
			const invalidSignaturesTestTransaction = new TestTransaction(
				invalidSignaturesTransaction as any,
			);
			const {
				id,
				status,
				errors,
			} = invalidSignaturesTestTransaction.validate();

			expect(id).toEqual(invalidSignaturesTestTransaction.id);
			expect((errors as ReadonlyArray<TransactionError>)[0]).toBeInstanceOf(
				TransactionError,
			);
			expect((errors as ReadonlyArray<TransactionError>)[0].dataPath).toEqual(
				'.signatures',
			);
			expect(status).toEqual(Status.FAIL);
		});

		it('should throw when networkIdentifier is not provided', async () => {
			const trsWithoutNetworkIdentifier = new TransferTransaction({
				...defaultTransaction,
			});
			expect(() => trsWithoutNetworkIdentifier.validate()).toThrowError(
				'Network identifier is required to validate a transaction ',
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return a transaction response', async () => {
			const otherTransactions = [defaultTransaction, defaultTransaction];
			const {
				id,
				status,
				errors,
			} = validTestTransaction.verifyAgainstOtherTransactions(
				otherTransactions,
			);
			expect(id).toEqual(validTestTransaction.id);
			expect(Object.keys(errors)).toHaveLength(0);
			expect(status).toEqual(Status.OK);
		});
	});

	describe('#addVerifiedMultisignature', () => {
		it('should return a successful transaction response if no duplicate signatures', async () => {
			const {
				id,
				status,
				errors,
			} = validMultisignatureTransaction.addVerifiedMultisignature(
				'3df1fae6865ec72783dcb5f87a7d906fe20b71e66ad9613c01a89505ebd77279e67efa2c10b5ad880abd09efd27ea350dd8a094f44efa3b4b2c8785fbe0f7e00',
			);

			expect(id).toEqual(validMultisignatureTransaction.id);
			expect(errors).toEqual([]);
			expect(status).toEqual(Status.OK);
		});

		it.skip('should return a failed transaction response if duplicate signatures', async () => {
			const {
				id,
				status,
				errors,
			} = validMultisignatureTransaction.addVerifiedMultisignature(
				'4424342c342093f80f52f919876fc0abada5385e98e8caf211add16d1c0f5453ef6e47fa58a454128a9640f3b6e2ade618e5ee5fa8eebc4d68460d19f042050f',
			);

			expect(id).toEqual(validMultisignatureTransaction.id);
			expect(status).toEqual(Status.FAIL);
			(errors as ReadonlyArray<TransactionError>).forEach(error => {
				expect(error).toBeInstanceOf(TransactionError);
				expect(error.message).toEqual('Failed to add signature.');
			});
		});
	});

	describe('#apply', () => {
		it('should return a successful transaction response with an updated sender account', async () => {
			store.account.getOrDefault = () => defaultSenderAccount;
			const { id, status, errors } = await validTestTransaction.apply(store);

			expect(id).toEqual(validTestTransaction.id);
			expect(status).toEqual(Status.OK);
			expect(Object.keys(errors)).toHaveLength(0);
		});

		it('should return a failed transaction response with insufficient account balance', async () => {
			store = new StateStoreMock([
				{
					...defaultSenderAccount,
					balance: BigInt('0'),
				},
			]);
			const { id, status, errors } = await validTestTransaction.apply(store);

			expect(id).toEqual(validTestTransaction.id);
			expect(status).toEqual(Status.FAIL);
			expect((errors as ReadonlyArray<TransactionError>)[0]).toBeInstanceOf(
				TransactionError,
			);
			expect((errors as ReadonlyArray<TransactionError>)[0].message).toContain(
				'Account does not have enough minimum remaining LSK',
			);
		});

		it('should return a failed transaction response with insufficient minimum remaining balance', async () => {
			const senderBalance =
				BigInt((validTestTransaction as any).asset.amount) +
				BigInt((validTestTransaction as any).fee) +
				BaseTransaction.MIN_REMAINING_BALANCE -
				BigInt(10000);

			store = new StateStoreMock([
				{
					...defaultSenderAccount,
					balance: senderBalance,
				},
			]);

			const { id, status, errors } = await validTestTransaction.apply(store);

			expect(id).toEqual(validTestTransaction.id);
			expect(status).toEqual(Status.FAIL);
			expect((errors as ReadonlyArray<TransactionError>)[0]).toBeInstanceOf(
				TransactionError,
			);
			expect((errors as ReadonlyArray<TransactionError>)[0].message).toEqual(
				`Account does not have enough minimum remaining LSK: ${defaultSenderAccount.address}, balance: 0.0049`,
			);
		});

		it('should return a successful transaction response with matching minimum remaining balance', async () => {
			const senderBalance =
				BigInt((validTestTransaction as any).asset.amount) +
				BigInt((validTestTransaction as any).fee) +
				BaseTransaction.MIN_REMAINING_BALANCE;

			store = new StateStoreMock([
				{
					...defaultSenderAccount,
					balance: senderBalance,
				},
			]);
			const { id, status, errors } = await validTestTransaction.apply(store);

			expect(id).toEqual(validTestTransaction.id);
			expect(status).toEqual(Status.OK);
			expect(Object.keys(errors)).toHaveLength(0);
		});

		it('should return a successful transaction response with extra minimum remaining balance', async () => {
			const senderBalance =
				BigInt((validTestTransaction as any).asset.amount) +
				BigInt((validTestTransaction as any).fee) +
				BaseTransaction.MIN_REMAINING_BALANCE +
				BigInt(10000);

			store = new StateStoreMock([
				{
					...defaultSenderAccount,
					balance: senderBalance,
				},
			]);
			const { id, status, errors } = await validTestTransaction.apply(store);

			expect(id).toEqual(validTestTransaction.id);
			expect(status).toEqual(Status.OK);
			expect(Object.keys(errors)).toHaveLength(0);
		});
	});

	describe('#undo', () => {
		it('should return a successful transaction response with an updated sender account', async () => {
			// Arrange
			store = new StateStoreMock([
				{
					...defaultAccount,
					address: (validTestTransaction as any).asset.recipientId,
					balance: (validTestTransaction as any).asset.amount,
				},
			]);

			// Act
			const { id, status, errors } = await validTestTransaction.undo(store);

			// Assert
			expect(id).toEqual(validTestTransaction.id);
			expect(status).toEqual(Status.OK);
			expect(errors).toEqual([]);
		});

		it('should return a failed transaction response with account balance exceeding max amount', async () => {
			store = new StateStoreMock([
				{
					...defaultSenderAccount,
					balance: BigInt(MAX_TRANSACTION_AMOUNT),
				},
			]);
			const { id, status, errors } = await validTestTransaction.undo(store);
			expect(id).toEqual(validTestTransaction.id);
			expect(status).toEqual(Status.FAIL);
			expect((errors as ReadonlyArray<TransactionError>)[0]).toBeInstanceOf(
				TransactionError,
			);
			expect((errors as ReadonlyArray<TransactionError>)[0].message).toEqual(
				'Invalid balance amount',
			);
		});
	});

	describe('#isExpired', () => {
		let unexpiredTestTransaction: BaseTransaction;
		let expiredTestTransaction: BaseTransaction;
		beforeEach(async () => {
			const unexpiredTransaction = {
				...defaultTransaction,
				receivedAt: new Date().toISOString(),
			};
			const expiredTransaction = {
				...defaultTransaction,
				receivedAt: new Date(+new Date() - 1300 * 60000).toISOString(),
			};
			unexpiredTestTransaction = new TestTransaction(unexpiredTransaction);
			expiredTestTransaction = new TestTransaction(expiredTransaction);
		});

		it('should return false for unexpired transaction', async () => {
			expect(unexpiredTestTransaction.isExpired()).toBe(false);
		});

		it('should return true for expired transaction', async () => {
			expect(expiredTestTransaction.isExpired(new Date())).toBe(true);
		});
	});

	describe('create, sign and stringify transaction', () => {
		it('should return correct senderId/senderPublicKey when sign with passphrase', () => {
			const newTransaction = new TransferTransaction({
				...transferFixture.testCases[0].input.transaction,
				networkIdentifier: transferFixture.testCases[0].input.networkIdentifier,
			});
			newTransaction.sign(
				transferFixture.testCases[0].input.account.passphrase,
			);

			const stringifiedTransaction = newTransaction.stringify();
			const parsedResponse = JSON.parse(stringifiedTransaction);

			expect(parsedResponse.senderPublicKey).toEqual(
				transferFixture.testCases[0].output.senderPublicKey,
			);
			expect(parsedResponse.signature).toEqual(
				transferFixture.testCases[0].output.signature,
			);
		});
	});

	describe('#sign', () => {
		const defaultPassphrase = 'passphrase';
		const defaultHash = Buffer.from(
			'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b02111111',
			'hex',
		);

		const defaultSignature =
			'dc8fe25f817c81572585b3769f3c6df13d3dc93ff470b2abe807f43a3359ed94e9406d2539013971431f2d540e42dc7d3d71c7442da28572c827d59adc5dfa08';

		let signDataStub: jest.SpyInstance;

		beforeEach(async () => {
			const hashStub = jest
				.spyOn(cryptography, 'hash')
				.mockReturnValueOnce(defaultHash);
			hashStub.mockReturnValue(defaultHash);
			signDataStub = jest
				.spyOn(cryptography, 'signData')
				.mockReturnValueOnce(defaultSignature);
		});

		describe('when sign is called with passphrase', () => {
			beforeEach(async () => {
				transactionWithDefaultValues.sign(defaultPassphrase);
			});

			it('should set signature property', async () => {
				expect(transactionWithDefaultValues.signature).toBe(defaultSignature);
			});

			it('should not set signSignature property', async () => {
				expect(transactionWithDefaultValues.signSignature).toBeUndefined();
			});

			it('should set id property', async () => {
				expect(transactionWithDefaultValues.id).not.toBeEmpty();
			});

			it('should set senderId property', async () => {
				expect(transactionWithDefaultValues.senderId).not.toBeEmpty();
			});

			it('should set senderPublicKey property', async () => {
				expect(transactionWithDefaultValues.senderPublicKey).not.toBeEmpty();
			});

			it('should call signData with the hash result and the passphrase', async () => {
				expect(signDataStub).toHaveBeenCalledWith(
					defaultHash,
					defaultPassphrase,
				);
			});
		});
	});
});
