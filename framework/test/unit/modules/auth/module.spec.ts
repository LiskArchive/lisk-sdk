/*
 * Copyright © 2021 Lisk Foundation
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
import { codec } from '@liskhq/lisk-codec';
import { utils, address as cryptoAddress } from '@liskhq/lisk-cryptography';
import { Transaction, BlockAssets, EMPTY_BUFFER } from '@liskhq/lisk-chain';
import { when } from 'jest-when';
import { AuthModule } from '../../../../src/modules/auth';
import * as testing from '../../../../src/testing';
import { genesisAuthStoreSchema } from '../../../../src/modules/auth/schemas';
import { TransactionExecuteContext, VerifyStatus } from '../../../../src/state_machine';
import { InvalidNonceError } from '../../../../src/modules/auth/errors';
import { createGenesisBlockContext } from '../../../../src/testing';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import {
	authAccountSchema,
	AuthAccountStore,
} from '../../../../src/modules/auth/stores/auth_account';
import {
	chainID,
	unsignedRegisterMultisigTx,
	multisigAddress,
	keyPairs,
	multisigParams,
} from './multisig_fixture';
import { ADDRESS_LENGTH } from '../../../../src/modules/auth/constants';

describe('AuthModule', () => {
	let authAccountStoreMock: jest.Mock;
	let storeMock: jest.Mock;
	let stateStore: any;
	let authModule: AuthModule;

	const registerMultisigTx = new Transaction(unsignedRegisterMultisigTx);

	beforeEach(async () => {
		authAccountStoreMock = jest.fn();
		storeMock = jest.fn().mockReturnValue({ getWithSchema: authAccountStoreMock });

		authModule = new AuthModule();
		await authModule.init({ genesisConfig: {}, moduleConfig: {} } as never);
		stateStore = { getStore: storeMock };
	});

	describe('initGenesisState', () => {
		const publicKey = utils.getRandomBytes(32);
		const validAsset = {
			authDataSubstore: [
				{
					address: utils.getRandomBytes(ADDRESS_LENGTH),
					authAccount: {
						numberOfSignatures: 0,
						mandatoryKeys: [],
						optionalKeys: [],
						nonce: BigInt(23),
					},
				},
				{
					address: utils.getRandomBytes(ADDRESS_LENGTH),
					authAccount: {
						numberOfSignatures: 3,
						mandatoryKeys: [utils.getRandomBytes(32), utils.getRandomBytes(32)].sort((a, b) =>
							a.compare(b),
						),
						optionalKeys: [utils.getRandomBytes(32), utils.getRandomBytes(32)].sort((a, b) =>
							a.compare(b),
						),
						nonce: BigInt(1),
					},
				},
			],
		};
		const invalidTestData = [
			[
				'when store key is not 20 bytes',
				{
					authDataSubstore: [
						{
							address: utils.getRandomBytes(8),
							authAccount: {
								numberOfSignatures: 0,
								mandatoryKeys: [],
								optionalKeys: [],
								nonce: BigInt(1),
							},
						},
					],
				},
			],
			[
				'mandatory key is not lexicographically sorted',
				{
					authDataSubstore: [
						{
							address: utils.getRandomBytes(ADDRESS_LENGTH),
							authAccount: {
								numberOfSignatures: 3,
								mandatoryKeys: [utils.getRandomBytes(32), utils.getRandomBytes(32)].sort((a, b) =>
									b.compare(a),
								),
								optionalKeys: [],
								nonce: BigInt(1),
							},
						},
					],
				},
			],
			[
				'mandatory key is not unique',
				{
					authDataSubstore: [
						{
							address: utils.getRandomBytes(ADDRESS_LENGTH),
							authAccount: {
								numberOfSignatures: 2,
								mandatoryKeys: [publicKey, publicKey],
								optionalKeys: [],
								nonce: BigInt(1),
							},
						},
					],
				},
			],
			[
				'optional key is not lexicographically sorted',
				{
					authDataSubstore: [
						{
							address: utils.getRandomBytes(ADDRESS_LENGTH),
							authAccount: {
								numberOfSignatures: 3,
								mandatoryKeys: [],
								optionalKeys: [utils.getRandomBytes(32), utils.getRandomBytes(32)].sort((a, b) =>
									b.compare(a),
								),
								nonce: BigInt(1),
							},
						},
					],
				},
			],
			[
				'optional key is not unique',
				{
					authDataSubstore: [
						{
							address: utils.getRandomBytes(ADDRESS_LENGTH),
							authAccount: {
								numberOfSignatures: 2,
								mandatoryKeys: [],
								optionalKeys: [publicKey, publicKey],
								nonce: BigInt(1),
							},
						},
					],
				},
			],
			[
				'exceed total keys',
				{
					authDataSubstore: [
						{
							address: utils.getRandomBytes(ADDRESS_LENGTH),
							authAccount: {
								numberOfSignatures: 36,
								mandatoryKeys: Array.from({ length: 33 }, () => utils.getRandomBytes(32)).sort(
									(a, b) => b.compare(a),
								),
								optionalKeys: Array.from({ length: 33 }, () => utils.getRandomBytes(32)).sort(
									(a, b) => b.compare(a),
								),
								nonce: BigInt(1),
							},
						},
					],
				},
			],
			[
				'number of signatures exceed total keys',
				{
					authDataSubstore: [
						{
							address: utils.getRandomBytes(ADDRESS_LENGTH),
							authAccount: {
								numberOfSignatures: 3,
								mandatoryKeys: [],
								optionalKeys: [utils.getRandomBytes(32), utils.getRandomBytes(32)].sort((a, b) =>
									b.compare(a),
								),
								nonce: BigInt(1),
							},
						},
					],
				},
			],
			[
				'number of signatures less than mandatory keys',
				{
					authDataSubstore: [
						{
							address: utils.getRandomBytes(ADDRESS_LENGTH),
							authAccount: {
								numberOfSignatures: 1,
								mandatoryKeys: [utils.getRandomBytes(32), utils.getRandomBytes(32)].sort((a, b) =>
									b.compare(a),
								),
								optionalKeys: [],
								nonce: BigInt(1),
							},
						},
					],
				},
			],
		];

		beforeEach(() => {
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		});

		it('should not throw error if asset does not exist', async () => {
			const context = createGenesisBlockContext({ stateStore }).createInitGenesisStateContext();
			jest.spyOn(context, 'getStore');

			await expect(authModule.initGenesisState(context)).toResolve();
			expect(context.getStore).not.toHaveBeenCalled();
		});

		it('should resolve when asset is valid', async () => {
			const assetBytes = codec.encode(genesisAuthStoreSchema, validAsset);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([{ module: authModule.name, data: assetBytes }]),
			}).createInitGenesisStateContext();
			jest.spyOn(context, 'getStore');

			await expect(authModule.initGenesisState(context)).toResolve();
			const authStore = authModule.stores.get(AuthAccountStore);
			for (const data of validAsset.authDataSubstore) {
				await expect(authStore.has(context, data.address)).resolves.toBeTrue();
			}
		});

		describe.each(invalidTestData)('%p', (_, data) => {
			it('should throw error when asset is invalid', async () => {
				const assetBytes = codec.encode(genesisAuthStoreSchema, data as object);
				const context = createGenesisBlockContext({
					stateStore,
					assets: new BlockAssets([{ module: authModule.name, data: assetBytes }]),
				}).createInitGenesisStateContext();

				await expect(authModule.initGenesisState(context)).toReject();
			});
		});
	});

	describe('verifyTransaction', () => {
		describe('Invalid nonce errors', () => {
			const accountNonce = BigInt(2);

			beforeEach(() => {
				when(authAccountStoreMock).calledWith(multisigAddress, authAccountSchema).mockReturnValue({
					mandatoryKeys: [],
					optionalKeys: [],
					nonce: accountNonce,
					numberOfSignatures: 0,
				});
			});

			it('should return FAIL status with error when trx nonce is lower than account nonce', async () => {
				const context = testing
					.createTransactionContext({
						stateStore,
						transaction: registerMultisigTx,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).rejects.toThrow(
					new InvalidNonceError(
						`Transaction with id:${registerMultisigTx.id.toString(
							'hex',
						)} nonce is lower than account nonce.`,
						registerMultisigTx.nonce,
						accountNonce,
					),
				);
			});

			it('should return PENDING status with no error when trx nonce is higher than account nonce', async () => {
				const transaction = new Transaction({
					module: 'token',
					command: 'transfer',
					nonce: BigInt(4),
					fee: BigInt(100_000_000),
					senderPublicKey: keyPairs[0].publicKey,
					params: utils.getRandomBytes(100),
					signatures: [],
				});

				transaction.sign(chainID, keyPairs[0].privateKey);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).resolves.toEqual({
					status: VerifyStatus.PENDING,
				});
			});
		});

		describe('Multi-signature registration transaction', () => {
			registerMultisigTx.sign(chainID, keyPairs[0].privateKey);

			it('should not throw for a valid transaction', async () => {
				when(authAccountStoreMock)
					.calledWith(multisigAddress, authAccountSchema)
					.mockReturnValue({
						mandatoryKeys: [],
						optionalKeys: [],
						nonce: BigInt(0),
						numberOfSignatures: 0,
					});

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction: registerMultisigTx,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).resolves.toEqual({
					status: VerifyStatus.OK,
				});
			});
		});

		describe('Transaction from a single signature account', () => {
			let transaction: Transaction;

			const singleSigAddress = cryptoAddress.getAddressFromPublicKey(keyPairs[1].publicKey);

			beforeEach(() => {
				transaction = new Transaction({
					module: 'token',
					command: 'transfer',
					nonce: BigInt(0),
					fee: BigInt(100_000_000),
					senderPublicKey: keyPairs[1].publicKey,
					params: utils.getRandomBytes(100),
					signatures: [],
				});

				when(authAccountStoreMock)
					.calledWith(singleSigAddress, authAccountSchema)
					.mockReturnValue({
						mandatoryKeys: [],
						optionalKeys: [],
						nonce: BigInt(0),
						numberOfSignatures: 0,
					});
			});

			it('should not throw for a valid transaction', async () => {
				transaction.sign(chainID, keyPairs[1].privateKey);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).resolves.toEqual({
					status: VerifyStatus.OK,
				});
			});

			it('should throw if signature is invalid', async () => {
				transaction.signatures.push(utils.getRandomBytes(64));

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).rejects.toThrow(
					'Failed to validate signature',
				);
			});

			it('should throw if signature is missing', async () => {
				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).rejects.toThrow(
					'Transactions from a single signature account should have exactly one signature. Found 0 signatures.',
				);
			});

			it('should throw error if account is not multi signature and more than one signature present', async () => {
				transaction.sign(chainID, keyPairs[1].privateKey);
				transaction.signatures.push(utils.getRandomBytes(64));

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).rejects.toThrow(
					'Transactions from a single signature account should have exactly one signature. Found 2 signatures.',
				);
			});
		});

		describe('Transaction from a multi-signature account', () => {
			let transaction: Transaction;

			const privateKeys = {
				mandatory: [keyPairs[0].privateKey, keyPairs[1].privateKey],
				optional: [keyPairs[2].privateKey, keyPairs[3].privateKey],
			};

			beforeEach(() => {
				when(authAccountStoreMock)
					.calledWith(multisigAddress, authAccountSchema)
					.mockResolvedValue({
						numberOfSignatures: 3,
						mandatoryKeys: multisigParams.mandatoryKeys,
						optionalKeys: multisigParams.optionalKeys,
						nonce: BigInt(0),
					});

				transaction = new Transaction({
					module: 'token',
					command: 'transfer',
					nonce: BigInt(0),
					fee: BigInt(100_000_000),
					senderPublicKey: multisigParams.mandatoryKeys[0],
					params: utils.getRandomBytes(100),
					signatures: [],
				});
			});

			it('should verify a valid transaction from a 1-of-2 multisig account with 0 mandatory signers', async () => {
				when(authAccountStoreMock)
					.calledWith(multisigAddress, authAccountSchema)
					.mockResolvedValue({
						numberOfSignatures: 1,
						mandatoryKeys: [],
						optionalKeys: multisigParams.optionalKeys,
						nonce: BigInt(0),
					});

				transaction.sign(chainID, privateKeys.optional[0]);
				transaction.signatures.push(EMPTY_BUFFER);

				let context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).resolves.toEqual({
					status: VerifyStatus.OK,
				});

				// now do the same, but with the other optional signature present
				transaction.signatures.splice(0, 2);
				transaction.signatures.push(EMPTY_BUFFER);
				transaction.sign(chainID, privateKeys.optional[1]);

				context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).resolves.toEqual({
					status: VerifyStatus.OK,
				});
			});

			it('should verify a valid transaction from 3-of-4 multisig account with 2 mandatory signers, when the first optional signature is present', async () => {
				transaction.sign(chainID, privateKeys.mandatory[0]);
				transaction.sign(chainID, privateKeys.mandatory[1]);
				transaction.sign(chainID, privateKeys.optional[0]);
				transaction.signatures.push(EMPTY_BUFFER);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).resolves.toEqual({
					status: VerifyStatus.OK,
				});
			});

			it('should verify a valid transaction from 3-of-4 multisig account with 2 mandatory signers, when the second optional signature is present', async () => {
				transaction.sign(chainID, privateKeys.mandatory[0]);
				transaction.sign(chainID, privateKeys.mandatory[1]);
				transaction.signatures.push(EMPTY_BUFFER);
				transaction.sign(chainID, privateKeys.optional[1]);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).resolves.toEqual({
					status: VerifyStatus.OK,
				});
			});

			it('should throw when an optional absent signature is not replaced by an empty buffer', async () => {
				transaction.sign(chainID, privateKeys.mandatory[0]);
				transaction.sign(chainID, privateKeys.mandatory[1]);
				transaction.sign(chainID, privateKeys.optional[1]);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).rejects.toThrow(
					`Transaction signatures does not match required number of signatures: '3' for transaction with id '${transaction.id.toString(
						'hex',
					)}'`,
				);
			});

			it('should throw when a transaction from 3-of-4 multisig account has 4 signatures', async () => {
				transaction.sign(chainID, privateKeys.mandatory[0]);
				transaction.sign(chainID, privateKeys.mandatory[1]);
				transaction.sign(chainID, privateKeys.optional[0]);
				transaction.sign(chainID, privateKeys.optional[1]);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).rejects.toThrow(
					`Transaction signatures does not match required number of signatures: '3' for transaction with id '${transaction.id.toString(
						'hex',
					)}'`,
				);
			});

			it('should throw when a transaction from 3-of-4 multisig account with 2 mandatory signers has only 2 mandatory signatures', async () => {
				transaction.sign(chainID, privateKeys.mandatory[0]);
				transaction.sign(chainID, privateKeys.mandatory[1]);
				transaction.signatures.push(EMPTY_BUFFER);
				transaction.signatures.push(EMPTY_BUFFER);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).rejects.toThrow(
					`Transaction signatures does not match required number of signatures: '3' for transaction with id '${transaction.id.toString(
						'hex',
					)}'`,
				);
			});

			it('should throw when a transaction from 3-of-4 multisig account with 2 mandatory signers has only 2 optional signatures', async () => {
				transaction.signatures.push(EMPTY_BUFFER);
				transaction.signatures.push(EMPTY_BUFFER);
				transaction.sign(chainID, privateKeys.optional[0]);
				transaction.sign(chainID, privateKeys.optional[1]);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).rejects.toThrow(
					`Transaction signatures does not match required number of signatures: '3' for transaction with id '${transaction.id.toString(
						'hex',
					)}'`,
				);
			});

			it('should throw if a mandatory signature is absent', async () => {
				transaction.sign(chainID, privateKeys.mandatory[0]);
				transaction.signatures.push(EMPTY_BUFFER);
				transaction.sign(chainID, privateKeys.optional[0]);
				transaction.sign(chainID, privateKeys.optional[1]);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).rejects.toThrow(
					'Missing signature for a mandatory key.',
				);
			});

			it('should throw if a mandatory signature is invalid', async () => {
				transaction.signatures.push(utils.getRandomBytes(64));
				transaction.sign(chainID, privateKeys.mandatory[1]);
				transaction.signatures.push(EMPTY_BUFFER);
				transaction.sign(chainID, privateKeys.optional[1]);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).rejects.toThrow(
					'Failed to validate signature',
				);
			});

			it('should throw if an optional signature is invalid', async () => {
				transaction.sign(chainID, privateKeys.mandatory[0]);
				transaction.sign(chainID, privateKeys.mandatory[1]);
				transaction.signatures.push(utils.getRandomBytes(64));
				transaction.signatures.push(EMPTY_BUFFER);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).rejects.toThrow(
					'Failed to validate signature',
				);
			});

			it('should throw if mandatory signatures are not in order', async () => {
				transaction.sign(chainID, privateKeys.mandatory[1]);
				transaction.sign(chainID, privateKeys.mandatory[0]);
				transaction.signatures.push(EMPTY_BUFFER);
				transaction.sign(chainID, privateKeys.optional[1]);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).rejects.toThrow(
					`Failed to validate signature '${transaction.signatures[0].toString(
						'hex',
					)}' for transaction with id '${transaction.id.toString('hex')}'`,
				);
			});

			it('should throw if optional signatures are not in order', async () => {
				transaction.sign(chainID, privateKeys.mandatory[0]);
				transaction.sign(chainID, privateKeys.mandatory[1]);
				transaction.signatures.push(EMPTY_BUFFER);
				transaction.sign(chainID, privateKeys.optional[0]);

				const context = testing
					.createTransactionContext({
						stateStore,
						transaction,
						chainID,
					})
					.createTransactionVerifyContext();

				await expect(authModule.verifyTransaction(context)).rejects.toThrow(
					`Failed to validate signature '${transaction.signatures[3].toString(
						'hex',
					)}' for transaction with id '${transaction.id.toString('hex')}'`,
				);
			});
		});
	});

	describe('beforeCommandExecute', () => {
		let authAccountStore: AuthAccountStore;
		let context: TransactionExecuteContext;

		beforeEach(() => {
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			authAccountStore = authModule.stores.get(AuthAccountStore);

			context = testing
				.createTransactionContext({
					stateStore,
					transaction: registerMultisigTx,
					chainID,
				})
				.createTransactionExecuteContext();
		});

		it('should increment account nonce after a transaction', async () => {
			const authAccountBeforeTransaction = {
				nonce: BigInt(registerMultisigTx.nonce),
				numberOfSignatures: 4,
				mandatoryKeys: multisigParams.mandatoryKeys,
				optionalKeys: multisigParams.optionalKeys,
			};
			await authAccountStore.set(context, multisigAddress, authAccountBeforeTransaction);

			await authModule.beforeCommandExecute(context);

			const authAccountAfterTransaction = await authAccountStore.get(
				context,
				context.transaction.senderAddress,
			);

			expect(authAccountAfterTransaction.nonce).toBe(
				authAccountBeforeTransaction.nonce + BigInt(1),
			);
			expect(authAccountAfterTransaction.numberOfSignatures).toBe(
				authAccountBeforeTransaction.numberOfSignatures,
			);
			expect(authAccountAfterTransaction.mandatoryKeys).toEqual(
				authAccountBeforeTransaction.mandatoryKeys,
			);
			expect(authAccountAfterTransaction.optionalKeys).toEqual(
				authAccountBeforeTransaction.optionalKeys,
			);
		});

		it('should initialize account with default values when the account is not in Auth Store', async () => {
			await authModule.beforeCommandExecute(context);

			const authAccount = await authAccountStore.get(context, context.transaction.senderAddress);

			expect(authAccount.nonce).toBe(BigInt(1)); // the hook incremented nonce
			expect(authAccount.numberOfSignatures).toBe(0);
			expect(authAccount.mandatoryKeys).toEqual([]);
			expect(authAccount.optionalKeys).toEqual([]);
		});
	});
});
