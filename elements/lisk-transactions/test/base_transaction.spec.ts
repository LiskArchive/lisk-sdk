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
import * as secondSignatureReg from '../fixtures/transaction_multisignature_registration/multisignature_registration_2nd_sig_equivalent_transaction.json';
import { defaultAccount, StateStoreMock } from './utils/state_store_mock';
import { serializeSignatures } from '../src/utils';

const getAccount = (account: object): any => {
	const object = {
		balance: 0,
		producedBlocks: 0,
		missedBlocks: 0,
		...account,
		keys: {
			mandatoryKeys: [],
			optionalKeys: [],
			numberOfSignatures: 0,
		},
	};

	(object as any).nonce = BigInt((account as any).nonce || 0);

	return object;
};

describe('Base transaction class', () => {
	const defaultTransaction = addTransactionFields(
		transferFixture.testCases[0].output,
	);

	const defaultSenderAccount = getAccount({
		...transferFixture.testCases[0].input.account,
		balance: BigInt('1000000000000'),
	});

	const networkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

	let validTestTransaction: BaseTransaction;
	let transactionWithDefaultValues: BaseTransaction;
	let transactionWithBasicImpl: BaseTransaction;
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

		it('should have type number', async () => {
			expect(validTestTransaction.type).toBeNumber();
		});

		it('should have receivedAt Date', async () => {
			expect(validTestTransaction.receivedAt).toBeInstanceOf(Date);
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
				...validTestTransaction.signatures,
			);
		});

		it('should return a buffer with signatures bytes', async () => {
			const expectedBuffer = Buffer.concat([
				(validTestTransaction as any).getBasicBytes(),
				serializeSignatures((validTestTransaction as any).signatures),
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
				(transactionWithMissingNetworkIdentifierInstance as any).sign(
					undefined,
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

		it('should return a successful transaction response with a valid transaction with basic implementation', async () => {
			transactionWithBasicImpl.sign(networkIdentifier, 'passphrase');
			const { id, status, errors } = transactionWithBasicImpl.validate();

			expect(id).toEqual(transactionWithBasicImpl.id);
			expect(Object.keys(errors)).toHaveLength(0);
			expect(status).toEqual(Status.OK);
		});

		it('should call getBytes', async () => {
			const getBytesStub = jest
				.spyOn(validTestTransaction as any, 'getBytes')
				.mockReturnValue(
					Buffer.from(
						'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c679324300000000000000000000000000000000',
						'hex',
					),
				);
			validTestTransaction.validate();

			expect(getBytesStub).toHaveBeenCalledTimes(2);
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

	describe('#apply', () => {
		it('should return a successful transaction response with an updated sender account', async () => {
			store = new StateStoreMock([
				{
					...defaultSenderAccount,
				},
			]);
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

		it('should return a failed transaction response for incompatible nonce', async () => {
			// Arrange
			const accountNonce = BigInt(5);
			const txNonce = BigInt(4);
			const senderAccount = { ...defaultSenderAccount, nonce: accountNonce };
			validTestTransaction.nonce = txNonce;
			store = new StateStoreMock([senderAccount]);

			// Act
			const { id, status, errors } = await validTestTransaction.apply(store);

			// Assert
			expect(id).toEqual(validTestTransaction.id);
			expect(status).toEqual(Status.FAIL);
			expect((errors as ReadonlyArray<TransactionError>)[0]).toBeInstanceOf(
				TransactionError,
			);
			expect((errors as ReadonlyArray<TransactionError>)[0].message).toContain(
				`Incompatible transaction nonce for account: ${senderAccount.address}, Tx Nonce: ${txNonce}, Account Nonce: ${accountNonce}`,
			);
			expect((errors as ReadonlyArray<TransactionError>)[0].actual).toEqual(
				txNonce.toString(),
			);
			expect((errors as ReadonlyArray<TransactionError>)[0].expected).toEqual(
				accountNonce.toString(),
			);
		});

		it('should return a failed transaction response for higher nonce', async () => {
			// Arrange
			const accountNonce = BigInt(5);
			const txNonce = BigInt(6);
			const senderAccount = { ...defaultSenderAccount, nonce: accountNonce };
			validTestTransaction.nonce = txNonce;
			store = new StateStoreMock([senderAccount]);

			// Act
			const { id, status, errors } = await validTestTransaction.apply(store);

			// Assert
			expect(id).toEqual(validTestTransaction.id);
			expect(status).toEqual(Status.FAIL);
			expect((errors as ReadonlyArray<TransactionError>)[0]).toBeInstanceOf(
				TransactionError,
			);
			expect((errors as ReadonlyArray<TransactionError>)[0].message).toContain(
				`Higher transaction nonce for account: ${senderAccount.address}, Tx Nonce: ${txNonce}, Account Nonce: ${accountNonce}`,
			);
			expect((errors as ReadonlyArray<TransactionError>)[0].actual).toEqual(
				txNonce.toString(),
			);
			expect((errors as ReadonlyArray<TransactionError>)[0].expected).toEqual(
				accountNonce.toString(),
			);
		});

		it('should increment account nonce', async () => {
			// Arrange
			const senderAccount = { ...defaultSenderAccount };
			store = new StateStoreMock([defaultSenderAccount]);
			const accountNonce = senderAccount.nonce;

			// Act
			const { id, status, errors } = await validTestTransaction.apply(store);
			const updatedSender = await store.account.get(senderAccount.address);

			// Assert
			expect(id).toEqual(validTestTransaction.id);
			expect(status).toEqual(Status.OK);
			expect(Object.keys(errors)).toHaveLength(0);
			expect((updatedSender as any).nonce).toEqual(accountNonce + BigInt(1));
		});
		describe('when transactions are from collision account', () => {
			const collisionAccounts = [
				{
					address: '13555181540209512417L',
					passphrase:
						'annual youth lift quote off olive uncle town chief poverty extend series',
					publicKey:
						'b26dd40ba33e4785e49ddc4f106c0493ed00695817235c778f487aea5866400a',
				},
				{
					address: '13555181540209512417L',
					passphrase:
						'merry field slogan sibling convince gold coffee town fold glad mix page',
					publicKey:
						'ce33db918b059a6e99c402963b42cf51c695068007ef01d8c383bb8a41270263',
				},
			];

			let validCollisionTransaction: TransferTransaction;

			beforeEach(async () => {
				store = new StateStoreMock([
					{
						...defaultAccount,
						publicKey: undefined,
						address: collisionAccounts[0].address,
						balance: BigInt('10000000000'),
					},
				]);
				validCollisionTransaction = new TransferTransaction({
					...transferFixture.testCases[0].input.transaction,
					nonce: '0',
					fee: '10000000',
					senderPublicKey: collisionAccounts[0].publicKey,
					networkIdentifier:
						transferFixture.testCases[0].input.networkIdentifier,
				});
				validCollisionTransaction.sign(
					networkIdentifier,
					collisionAccounts[0].passphrase,
				);
			});

			it('should register public key to sender account if it does not exist', async () => {
				const { status, errors } = await validCollisionTransaction.apply(store);
				expect(status).toEqual(Status.OK);
				expect(Object.keys(errors)).toHaveLength(0);

				const account = await store.account.get(collisionAccounts[0].address);
				expect(account.publicKey).toEqual(collisionAccounts[0].publicKey);
			});

			it('should reject the transaction if the transaction is from collision account', async () => {
				const invalidCollisionTransaction = new TransferTransaction({
					...transferFixture.testCases[0].input.transaction,
					nonce: '0',
					fee: '10000000',
					senderPublicKey: collisionAccounts[1].publicKey,
					networkIdentifier:
						transferFixture.testCases[0].input.networkIdentifier,
				});
				invalidCollisionTransaction.sign(
					networkIdentifier,
					collisionAccounts[1].passphrase,
				);
				// Apply first and register the public key
				await validCollisionTransaction.apply(store);
				const { status, errors } = await invalidCollisionTransaction.apply(
					store,
				);
				expect(status).toEqual(Status.FAIL);
				expect(errors[0].message).toContain('Invalid sender publicKey');
			});
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

		it('should decrement account nonce', async () => {
			// Arrange
			const accountNonce = BigInt(5);
			const senderAccount = {
				...defaultSenderAccount,
				nonce: accountNonce,
			};
			const recipientAccount = {
				...defaultSenderAccount,
				address: (validTestTransaction as any).asset.recipientId,
				balance: (validTestTransaction as any).asset.amount,
			};
			store = new StateStoreMock([senderAccount, recipientAccount]);

			// Act
			const { id, status, errors } = await validTestTransaction.undo(store);

			const updatedSender = await store.account.get(senderAccount.address);

			// Assert
			expect(id).toEqual(validTestTransaction.id);
			expect(status).toEqual(Status.OK);
			expect(Object.keys(errors)).toHaveLength(0);
			expect((updatedSender as any).nonce).toEqual(accountNonce - BigInt(1));
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
			});
			newTransaction.sign(
				networkIdentifier,
				transferFixture.testCases[0].input.account.passphrase,
			);

			const stringifiedTransaction = newTransaction.stringify();
			const parsedResponse = JSON.parse(stringifiedTransaction);

			expect(parsedResponse.senderPublicKey).toEqual(
				transferFixture.testCases[0].output.senderPublicKey,
			);
			expect(parsedResponse.signatures).toEqual(
				transferFixture.testCases[0].output.signatures,
			);
		});
	});

	describe('#sign', () => {
		const validTransferInput = transferFixture.testCases[0].input;
		const { transaction, account, networkIdentifier } = validTransferInput;
		let validTransferInstance: BaseTransaction;

		beforeEach(async () => {
			validTransferInstance = new TransferTransaction(transaction);
		});

		it('should return transaction with one signature when only passphrase is used', async () => {
			// Get signature without using the method
			const networkIdentifierBytes = cryptography.hexToBuffer(
				networkIdentifier,
			);
			const bytesToBeSigned = Buffer.concat([
				networkIdentifierBytes,
				validTransferInstance.getBasicBytes(),
			]);

			const validSignature = cryptography.signData(
				cryptography.hash(bytesToBeSigned),
				account.passphrase,
			);

			validTransferInstance.sign(networkIdentifier, account.passphrase);

			expect(validTransferInstance.signatures[0]).toBe(validSignature);
			expect(validTransferInstance.signatures.length).toBe(1);
		});

		it('should return transaction with two valid signatures for multisig account used as 2nd passphrase account', async () => {
			const { members } = secondSignatureReg.testCases.input;
			const { output: secondSignatureAccount } = secondSignatureReg.testCases;
			// Get signatues without using the method
			const networkIdentifierBytes = cryptography.hexToBuffer(
				networkIdentifier,
			);
			const bytesToBeSigned = Buffer.concat([
				networkIdentifierBytes,
				validTransferInstance.getBasicBytes(),
			]);

			const firstSignature = cryptography.signData(
				cryptography.hash(bytesToBeSigned),
				members.mandatoryOne.passphrase,
			);

			const secondSignature = cryptography.signData(
				cryptography.hash(bytesToBeSigned),
				members.mandatoryTwo.passphrase,
			);

			validTransferInstance.sign(
				networkIdentifier,
				undefined,
				[members.mandatoryOne.passphrase, members.mandatoryTwo.passphrase],
				{
					...secondSignatureAccount.asset,
				},
			);

			expect(validTransferInstance.signatures[0]).toBe(firstSignature);
			expect(validTransferInstance.signatures[1]).toBe(secondSignature);
		});
	});
});
