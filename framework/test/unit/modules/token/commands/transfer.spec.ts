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

import { StateStore, Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { getAddressAndPublicKeyFromPassphrase, getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { VerifyStatus } from '../../../../../src';
import { TokenAPI } from '../../../../../src/modules/token/api';
import { TransferCommand } from '../../../../../src/modules/token/commands/transfer';
import {
	COMMAND_ID_TRANSFER,
	MIN_BALANCE,
	MODULE_ID_TOKEN,
	STORE_PREFIX_SUPPLY,
	STORE_PREFIX_USER,
} from '../../../../../src/modules/token/constants';
import {
	SupplyStoreData,
	supplyStoreSchema,
	transferParamsSchema,
	UserStoreData,
	userStoreSchema,
} from '../../../../../src/modules/token/schemas';
import { getUserStoreKey } from '../../../../../src/modules/token/utils';
import { createTransactionContext } from '../../../../../src/testing';

describe('Transfer command', () => {
	const localTokenID = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
	const secondTokenID = Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]);
	let command: TransferCommand;
	let interopAPI: {
		getOwnChainAccount: jest.Mock;
		send: jest.Mock;
		error: jest.Mock;
		terminateChain: jest.Mock;
		getChannel: jest.Mock;
	};

	beforeEach(() => {
		const moduleID = MODULE_ID_TOKEN;
		command = new TransferCommand(moduleID);
		interopAPI = {
			getOwnChainAccount: jest.fn().mockResolvedValue({ id: Buffer.from([0, 0, 0, 1]) }),
			send: jest.fn(),
			error: jest.fn(),
			terminateChain: jest.fn(),
			getChannel: jest.fn(),
		};
		const api = new TokenAPI(moduleID);
		api.addDependencies(interopAPI);
		api.init({
			minBalances: [
				{ tokenID: localTokenID, amount: BigInt(MIN_BALANCE) },
				{ tokenID: secondTokenID, amount: BigInt(MIN_BALANCE) },
			],
		});
		command.init({
			api,
		});
	});

	describe('verify', () => {
		it('should fail when tokenID does not have valid length', async () => {
			const context = createTransactionContext({
				transaction: new Transaction({
					moduleID: MODULE_ID_TOKEN,
					commandID: COMMAND_ID_TRANSFER,
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: getRandomBytes(32),
					params: codec.encode(transferParamsSchema, {
						tokenID: Buffer.from('0000000100', 'hex'),
						amount: BigInt(100000000),
						recipientAddress: getRandomBytes(20),
						data: '',
					}),
					signatures: [getRandomBytes(64)],
				}),
			});
			const result = await command.verify(context.createCommandVerifyContext(transferParamsSchema));

			expect(result.status).toEqual(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(".tokenID' minLength not satisfied");
		});

		it('should fail when recipientAddress is not 20 btyes', async () => {
			const context = createTransactionContext({
				transaction: new Transaction({
					moduleID: MODULE_ID_TOKEN,
					commandID: COMMAND_ID_TRANSFER,
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: getRandomBytes(32),
					params: codec.encode(transferParamsSchema, {
						tokenID: Buffer.from('000000010000', 'hex'),
						amount: BigInt(100000000),
						recipientAddress: getRandomBytes(30),
						data: '',
					}),
					signatures: [getRandomBytes(64)],
				}),
			});
			const result = await command.verify(context.createCommandVerifyContext(transferParamsSchema));

			expect(result.status).toEqual(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(".recipientAddress' maxLength exceeded");
		});

		it('should fail when data is more than 64 characters', async () => {
			const context = createTransactionContext({
				transaction: new Transaction({
					moduleID: MODULE_ID_TOKEN,
					commandID: COMMAND_ID_TRANSFER,
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: getRandomBytes(32),
					params: codec.encode(transferParamsSchema, {
						tokenID: Buffer.from('000000010000', 'hex'),
						amount: BigInt(100000000),
						recipientAddress: getRandomBytes(20),
						data: '1'.repeat(65),
					}),
					signatures: [getRandomBytes(64)],
				}),
			});
			const result = await command.verify(context.createCommandVerifyContext(transferParamsSchema));

			expect(result.status).toEqual(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(".data' must NOT have more than 64 characters");
		});

		it('should success when all parameters are valid', async () => {
			const context = createTransactionContext({
				transaction: new Transaction({
					moduleID: MODULE_ID_TOKEN,
					commandID: COMMAND_ID_TRANSFER,
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: getRandomBytes(32),
					params: codec.encode(transferParamsSchema, {
						tokenID: Buffer.from('0000000100000000', 'hex'),
						amount: BigInt(100000000),
						recipientAddress: getRandomBytes(20),
						data: '1'.repeat(64),
					}),
					signatures: [getRandomBytes(64)],
				}),
			});
			const result = await command.verify(context.createCommandVerifyContext(transferParamsSchema));

			expect(result.status).toEqual(VerifyStatus.OK);
		});
	});

	describe('execute', () => {
		let stateStore: StateStore;
		const sender = getAddressAndPublicKeyFromPassphrase('sender');
		const recipient = getAddressAndPublicKeyFromPassphrase('recipient');
		const thirdTokenID = Buffer.from([1, 0, 0, 0, 4, 0, 0, 0]);
		const tokenID = Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]);
		const senderBalance = BigInt(200000000);
		const totalSupply = BigInt('1000000000000');
		const recipientBalance = BigInt(1000);

		beforeEach(async () => {
			stateStore = new StateStore(new InMemoryKVStore());
			const userStore = stateStore.getStore(MODULE_ID_TOKEN, STORE_PREFIX_USER);
			await userStore.setWithSchema(
				getUserStoreKey(sender.address, localTokenID),
				{ availableBalance: senderBalance, lockedBalances: [] },
				userStoreSchema,
			);
			await userStore.setWithSchema(
				getUserStoreKey(sender.address, secondTokenID),
				{ availableBalance: senderBalance, lockedBalances: [] },
				userStoreSchema,
			);
			await userStore.setWithSchema(
				getUserStoreKey(sender.address, thirdTokenID),
				{ availableBalance: senderBalance, lockedBalances: [] },
				userStoreSchema,
			);
			await userStore.setWithSchema(
				getUserStoreKey(recipient.address, localTokenID),
				{ availableBalance: recipientBalance, lockedBalances: [] },
				userStoreSchema,
			);
			const supplyStore = stateStore.getStore(MODULE_ID_TOKEN, STORE_PREFIX_SUPPLY);
			await supplyStore.setWithSchema(localTokenID.slice(4), { totalSupply }, supplyStoreSchema);
		});

		it('should reject when sender does not have enough balance for amount', async () => {
			const context = createTransactionContext({
				stateStore,
				transaction: new Transaction({
					moduleID: MODULE_ID_TOKEN,
					commandID: COMMAND_ID_TRANSFER,
					fee: BigInt(0),
					nonce: BigInt(0),
					senderPublicKey: sender.publicKey,
					params: codec.encode(transferParamsSchema, {
						tokenID,
						amount: senderBalance + BigInt(1),
						recipientAddress: getRandomBytes(20),
						data: '1'.repeat(64),
					}),
					signatures: [getRandomBytes(64)],
				}),
			});
			await expect(
				command.execute(context.createCommandExecuteContext(transferParamsSchema)),
			).rejects.toThrow('balance 200000000 is not sufficient');
		});

		it('should resolve when recipient exist for different tokenID but does not have enough balance for minBalance', async () => {
			const context = createTransactionContext({
				stateStore,
				transaction: new Transaction({
					moduleID: MODULE_ID_TOKEN,
					commandID: COMMAND_ID_TRANSFER,
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: sender.publicKey,
					params: codec.encode(transferParamsSchema, {
						tokenID: thirdTokenID,
						amount: recipientBalance + BigInt(1),
						recipientAddress: recipient.address,
						data: '1'.repeat(64),
					}),
					signatures: [getRandomBytes(64)],
				}),
			});
			await expect(
				command.execute(context.createCommandExecuteContext(transferParamsSchema)),
			).resolves.toBeUndefined();

			// Recipient should receive full amount
			const userStore = stateStore.getStore(MODULE_ID_TOKEN, STORE_PREFIX_USER);
			const result = await userStore.getWithSchema<UserStoreData>(
				getUserStoreKey(recipient.address, thirdTokenID),
				userStoreSchema,
			);
			expect(result.availableBalance).toEqual(recipientBalance + BigInt(1));
		});

		it('should reject when recipient does not exist and the token does not have min balance set', async () => {
			const recipientAddress = getRandomBytes(20);
			const amount = BigInt(100000000);
			const context = createTransactionContext({
				stateStore,
				transaction: new Transaction({
					moduleID: MODULE_ID_TOKEN,
					commandID: COMMAND_ID_TRANSFER,
					fee: BigInt(0),
					nonce: BigInt(0),
					senderPublicKey: sender.publicKey,
					params: codec.encode(transferParamsSchema, {
						tokenID: thirdTokenID,
						amount,
						recipientAddress,
						data: '1'.repeat(64),
					}),
					signatures: [getRandomBytes(64)],
				}),
			});
			await expect(
				command.execute(context.createCommandExecuteContext(transferParamsSchema)),
			).rejects.toThrow('Address cannot be initialized because min balance is not set');
		});

		it('should reject when recipient does not exist and amount is less than minBalance', async () => {
			const recipientAddress = getRandomBytes(20);
			const amount = BigInt(100);
			const context = createTransactionContext({
				stateStore,
				transaction: new Transaction({
					moduleID: MODULE_ID_TOKEN,
					commandID: COMMAND_ID_TRANSFER,
					fee: BigInt(0),
					nonce: BigInt(0),
					senderPublicKey: sender.publicKey,
					params: codec.encode(transferParamsSchema, {
						tokenID,
						amount,
						recipientAddress,
						data: '1'.repeat(64),
					}),
					signatures: [getRandomBytes(64)],
				}),
			});
			await expect(
				command.execute(context.createCommandExecuteContext(transferParamsSchema)),
			).rejects.toThrow('does not satisfy min balance requirement');
		});

		it('should resolve when recipient does not exist but amount is greater than minBalance', async () => {
			const recipientAddress = getRandomBytes(20);
			const amount = BigInt(100000000);
			const context = createTransactionContext({
				stateStore,
				transaction: new Transaction({
					moduleID: MODULE_ID_TOKEN,
					commandID: COMMAND_ID_TRANSFER,
					fee: BigInt(0),
					nonce: BigInt(0),
					senderPublicKey: sender.publicKey,
					params: codec.encode(transferParamsSchema, {
						tokenID,
						amount,
						recipientAddress,
						data: '1'.repeat(64),
					}),
					signatures: [getRandomBytes(64)],
				}),
			});
			await expect(
				command.execute(context.createCommandExecuteContext(transferParamsSchema)),
			).resolves.toBeUndefined();

			// Recipient should receive amount - min balance if not exist
			const userStore = stateStore.getStore(MODULE_ID_TOKEN, STORE_PREFIX_USER);
			const result = await userStore.getWithSchema<UserStoreData>(
				getUserStoreKey(recipientAddress, localTokenID),
				userStoreSchema,
			);
			expect(result.availableBalance).toEqual(amount - MIN_BALANCE);

			// Min balance is burnt
			const supplyStore = stateStore.getStore(MODULE_ID_TOKEN, STORE_PREFIX_SUPPLY);
			const supply = await supplyStore.getWithSchema<SupplyStoreData>(
				localTokenID.slice(4),
				supplyStoreSchema,
			);
			expect(supply.totalSupply).toEqual(totalSupply - MIN_BALANCE);
		});

		it('should resolve and not burn supply when tokenID is not native and recipient does not exist', async () => {
			const recipientAddress = getRandomBytes(20);
			const amount = BigInt(100000000);
			const context = createTransactionContext({
				stateStore,
				transaction: new Transaction({
					moduleID: MODULE_ID_TOKEN,
					commandID: COMMAND_ID_TRANSFER,
					fee: BigInt(0),
					nonce: BigInt(0),
					senderPublicKey: sender.publicKey,
					params: codec.encode(transferParamsSchema, {
						tokenID: secondTokenID,
						amount,
						recipientAddress,
						data: '1'.repeat(64),
					}),
					signatures: [getRandomBytes(64)],
				}),
			});
			await expect(
				command.execute(context.createCommandExecuteContext(transferParamsSchema)),
			).resolves.toBeUndefined();

			// Recipient should receive amount - min balance if not exist
			const userStore = stateStore.getStore(MODULE_ID_TOKEN, STORE_PREFIX_USER);
			const result = await userStore.getWithSchema<UserStoreData>(
				getUserStoreKey(recipientAddress, secondTokenID),
				userStoreSchema,
			);
			expect(result.availableBalance).toEqual(amount - MIN_BALANCE);

			// Total supply should not change
			// const supplyStore = stateStore.getStore(MODULE_ID_TOKEN, STORE_PREFIX_SUPPLY);
			// const supply = await supplyStore.getWithSchema<SupplyStoreData>(
			// 	localTokenID.slice(4),
			// 	supplyStoreSchema,
			// );
			// expect(supply.totalSupply).toEqual(totalSupply);
		});

		it('should resolve when recipient receive enough amount and sender has enough balance', async () => {
			const amount = BigInt(100000000);
			const context = createTransactionContext({
				stateStore,
				transaction: new Transaction({
					moduleID: MODULE_ID_TOKEN,
					commandID: COMMAND_ID_TRANSFER,
					fee: BigInt(0),
					nonce: BigInt(0),
					senderPublicKey: sender.publicKey,
					params: codec.encode(transferParamsSchema, {
						tokenID,
						amount,
						recipientAddress: recipient.address,
						data: '1'.repeat(64),
					}),
					signatures: [getRandomBytes(64)],
				}),
			});
			await expect(
				command.execute(context.createCommandExecuteContext(transferParamsSchema)),
			).toResolve();

			// Recipient should get full amount
			const userStore = stateStore.getStore(MODULE_ID_TOKEN, STORE_PREFIX_USER);
			const result = await userStore.getWithSchema<UserStoreData>(
				getUserStoreKey(recipient.address, localTokenID),
				userStoreSchema,
			);
			expect(result.availableBalance).toEqual(amount + recipientBalance);

			// total supply should not change
			const supplyStore = stateStore.getStore(MODULE_ID_TOKEN, STORE_PREFIX_SUPPLY);
			const supply = await supplyStore.getWithSchema<SupplyStoreData>(
				localTokenID.slice(4),
				supplyStoreSchema,
			);
			expect(supply.totalSupply).toEqual(totalSupply);
		});
	});
});
