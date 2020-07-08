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
import { hash } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { BaseTransaction } from '../src/base_transaction';
import { Status, TransactionError, TransferTransaction } from '../src';
import { TestTransaction, TestTransactionBasicImpl } from './helpers';
import * as fixture from '../fixtures/transaction_network_id_and_change_order/transfer_transaction_validate.json';
import * as multiSigFixture from '../fixtures/transaction_multisignature_registration/multisignature_registration_transaction.json';
import { defaultAccount, StateStoreMock } from './utils/state_store_mock';
import { BaseTransactionInput, Account } from '../src/types';
import { TransferAsset } from '../src/8_transfer_transaction';
import {
	MultiSignatureAsset,
	MultisignatureTransaction,
} from '../src/12_multisignature_transaction';

describe('Base transaction class', () => {
	const validTransferTransactionScenario = fixture.testCases[0];
	const validMultiSigTransactionScenario = multiSigFixture.testCases[4];

	const networkIdentifier = Buffer.from(
		validTransferTransactionScenario.input.networkIdentifier,
		'base64',
	);

	let decodedTransferTransaction: BaseTransactionInput<TransferAsset>;
	let decodedMultisigTransaction: BaseTransactionInput<MultiSignatureAsset>;

	let validTestTransaction: BaseTransaction;
	let transactionWithBasicImpl: BaseTransaction;
	let store: StateStoreMock;
	let defaultSenderAccount: Account;

	beforeEach(() => {
		{
			const buffer = Buffer.from(validTransferTransactionScenario.output.transaction, 'base64');
			const id = hash(buffer);
			const decodedBaseTransaction = codec.decode<BaseTransaction>(
				BaseTransaction.BASE_SCHEMA,
				buffer,
			);
			const decodedAsset = codec.decode<TransferAsset>(
				TransferTransaction.ASSET_SCHEMA as any,
				decodedBaseTransaction.asset as Buffer,
			);
			decodedTransferTransaction = {
				...decodedBaseTransaction,
				asset: decodedAsset,
				id,
			};
		}
		{
			const buffer = Buffer.from(validMultiSigTransactionScenario.output.transaction, 'base64');
			const id = hash(buffer);
			const decodedBaseTransaction = codec.decode<BaseTransaction>(
				BaseTransaction.BASE_SCHEMA,
				buffer,
			);
			const decodedAsset = codec.decode<MultiSignatureAsset>(
				MultisignatureTransaction.ASSET_SCHEMA as any,
				decodedBaseTransaction.asset as Buffer,
			);
			decodedMultisigTransaction = {
				...decodedBaseTransaction,
				asset: decodedAsset,
				id,
			};
		}
		defaultSenderAccount = defaultAccount({
			address: Buffer.from(validTransferTransactionScenario.input.account.address, 'base64'),
			nonce: decodedTransferTransaction.nonce,
			balance: BigInt('1000000000000'),
		});
		validTestTransaction = new TransferTransaction({
			...decodedTransferTransaction,
		});
		transactionWithBasicImpl = new TestTransactionBasicImpl({
			nonce: BigInt('1'),
			fee: BigInt('1000000'),
			senderPublicKey: Buffer.from(
				'ea1701c06e5de9eaaef52bed157e97d4f02331ab281badc1b0aaa4d50f31c574',
				'hex',
			),
			asset: {},
		});
		store = new StateStoreMock([defaultSenderAccount]);
	});

	describe('#minFee', () => {
		it('should set the minFee to minFeePerByte times bytelength for non delegate registration', () => {
			const byteLength = BigInt(validTestTransaction.getBytes().length);
			const minFeePerByte = 1000;

			expect(validTestTransaction.minFee).toEqual(byteLength * BigInt(minFeePerByte));
		});
	});

	describe('#getSigningBytes', () => {
		it('should call codec with base transaction schema with empty signatures', () => {
			jest.spyOn(codec, 'encode');
			validTestTransaction['getSigningBytes']();
			expect(codec.encode).toHaveBeenCalledWith(BaseTransaction.BASE_SCHEMA, {
				...validTestTransaction,
				asset: expect.anything(),
				signatures: [],
			});
		});

		it('should call assetToBytes for transaction with asset', () => {
			jest.spyOn(codec, 'encode');
			validTestTransaction['getSigningBytes']();
			expect(codec.encode).toHaveBeenCalledWith(
				TransferTransaction.ASSET_SCHEMA,
				validTestTransaction.asset,
			);
		});

		it('should return a buffer with correct bytes', () => {
			expect(validTestTransaction['getSigningBytes']).toMatchSnapshot();
		});
	});

	describe('#getBytes', () => {
		it('should encode asset bytes', () => {
			const buffer = Buffer.from(validTransferTransactionScenario.output.transaction, 'base64');
			expect(validTestTransaction.getBytes()).toEqual(buffer);
		});
	});

	describe('_validateSchema', () => {
		it('should validate the asset schema', () => {
			const tx = new TransferTransaction({
				...decodedTransferTransaction,
				asset: {
					...decodedTransferTransaction.asset,
					data:
						'53efe2e1b66ea35a356e07f99dbfd79965e94e78b3b80087485e38f25ff80b7453efe2e1b66ea35a356e07f99dbfd79965e94e78b3b80087485e38f25ff80b74',
				},
			});
			const errors = tx['_validateSchema']();

			expect(errors).toHaveLength(1);
			expect(errors[0].dataPath).toEqual('.data');
		});

		it('should return a successful transaction response with a valid transaction', () => {
			const errors = (validTestTransaction as any)._validateSchema();
			expect(Object.keys(errors)).toHaveLength(0);
		});

		it('should return a failed transaction response with invalid formatting', () => {
			const invalidTransaction = {
				type: 0,
				senderPublicKey: '11111111',
				timestamp: 79289378,
				asset: {},
				signature: '1111111111',
				id: '1',
			};
			const invalidTestTransaction = new TestTransaction(invalidTransaction as any);
			const errors = (invalidTestTransaction as any)._validateSchema();

			expect(Object.keys(errors)).not.toHaveLength(0);
		});
	});

	describe('#validate', () => {
		// TODO: undo skip, as this test transaction is no longer valid signature
		// It does not include the amount and recipient
		it('should return a successful transaction response with a valid transaction', () => {
			const { id, status, errors } = validTestTransaction.validate();

			expect(id).toEqual(validTestTransaction.id);
			expect(Object.keys(errors)).toHaveLength(0);
			expect(status).toEqual(Status.OK);
		});

		it('should return a successful transaction response with a valid transaction with basic implementation', () => {
			transactionWithBasicImpl.sign(
				networkIdentifier,
				'double furnace timber cross west walk matter aspect promote faint invest affair',
			);
			const { id, status, errors } = transactionWithBasicImpl.validate();

			expect(id).toEqual(transactionWithBasicImpl.id);
			expect(Object.keys(errors)).toHaveLength(0);
			expect(status).toEqual(Status.OK);
		});

		it('should call getBytes', () => {
			const buffer = Buffer.from(validTransferTransactionScenario.output.transaction, 'base64');
			const getBytesStub = jest
				.spyOn(validTestTransaction as any, 'getBytes')
				.mockReturnValue(buffer);
			validTestTransaction.validate();

			expect(getBytesStub).toHaveBeenCalledTimes(1);
		});

		it('should return error if fee is lower than min fee', () => {
			const tx = new TransferTransaction({
				...decodedTransferTransaction,
				fee: BigInt(0),
			});
			const { errors } = tx.validate();
			expect(errors).toHaveLength(1);
			expect(errors[0].dataPath).toEqual('.fee');
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
			expect(errors[0]).toBeInstanceOf(TransactionError);
			expect(errors[0].message).toContain('Account does not have enough minimum remaining LSK');
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
			expect(errors[0]).toBeInstanceOf(TransactionError);
			expect(errors[0].message).toEqual(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Account does not have enough minimum remaining LSK: ${defaultSenderAccount.address.toString(
					'base64',
				)}, balance: 0.0499`,
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
			expect(errors[0]).toBeInstanceOf(TransactionError);
			expect(errors[0].message).toContain(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Incompatible transaction nonce for account: ${senderAccount.address.toString(
					'base64',
				)}, Tx Nonce: ${txNonce.toString()}, Account Nonce: ${accountNonce.toString()}`,
			);
			expect(errors[0].actual).toEqual(txNonce.toString());
			expect(errors[0].expected).toEqual(accountNonce.toString());
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
			expect(errors[0]).toBeInstanceOf(TransactionError);
			expect(errors[0].message).toContain(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Transaction nonce for account: ${senderAccount.address.toString(
					'base64',
				)} is higher than expected, Tx Nonce: ${txNonce.toString()}, Account Nonce: ${accountNonce.toString()}`,
			);
			expect(errors[0].actual).toEqual(txNonce.toString());
			expect(errors[0].expected).toEqual(accountNonce.toString());
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
			// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
			expect((updatedSender as any).nonce).toEqual(accountNonce + BigInt(1));
		});
	});

	describe('create, sign and stringify transaction', () => {
		it('should return correct senderId/senderPublicKey when sign with passphrase', () => {
			const newTransaction = new TransferTransaction({
				...decodedTransferTransaction,
			});
			newTransaction.sign(
				networkIdentifier,
				validTransferTransactionScenario.input.account.passphrase,
			);

			expect(newTransaction.senderPublicKey).toEqual(validTestTransaction.senderPublicKey);
			expect(newTransaction.signatures).toEqual(validTestTransaction.signatures);
		});
	});

	describe('#sign', () => {
		const account = {
			address: Buffer.from(validTransferTransactionScenario.input.account.address, 'base64'),
			passphrase: validTransferTransactionScenario.input.account.passphrase,
		};
		let validTransferInstance: BaseTransaction;

		beforeEach(() => {
			validTransferInstance = new TransferTransaction(decodedTransferTransaction);
		});

		it('should return transaction with one signature when only passphrase is used', () => {
			// Get signature without using the method
			const bytesToBeSigned = Buffer.concat([
				networkIdentifier,
				validTransferInstance['getSigningBytes'](),
			]);

			const validSignature = cryptography.signData(bytesToBeSigned, account.passphrase);

			validTransferInstance.sign(networkIdentifier, account.passphrase);

			expect(validTransferInstance.signatures[0]).toEqual(validSignature);
			expect(validTransferInstance.signatures).toHaveLength(1);
		});

		it('should return transaction with two valid signatures for multisig account used as 2nd passphrase account', () => {
			const { members } = validMultiSigTransactionScenario.input as any;
			const bytesToBeSigned = Buffer.concat([
				networkIdentifier,
				validTransferInstance['getSigningBytes'](),
			]);

			const firstSignature = cryptography.signData(
				bytesToBeSigned,
				members.mandatoryOne.passphrase,
			);

			const secondSignature = cryptography.signData(
				bytesToBeSigned,
				members.mandatoryTwo.passphrase,
			);
			validTransferInstance.signatures = [];

			validTransferInstance.sign(
				networkIdentifier,
				undefined,
				[members.mandatoryOne.passphrase, members.mandatoryTwo.passphrase],
				{
					...decodedMultisigTransaction.asset,
				},
			);

			expect(validTransferInstance.signatures[0]).toEqual(firstSignature);
			expect(validTransferInstance.signatures[1]).toEqual(secondSignature);
		});
	});
});
