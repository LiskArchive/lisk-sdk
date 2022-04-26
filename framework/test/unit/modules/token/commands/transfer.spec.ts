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
	STORE_PREFIX_USER,
} from '../../../../../src/modules/token/constants';
import { transferParamsSchema, userStoreSchema } from '../../../../../src/modules/token/schemas';
import { getUserStoreKey } from '../../../../../src/modules/token/utils';
import { createTransactionContext } from '../../../../../src/testing';

describe('Transfer command', () => {
	let command: TransferCommand;
	let interopAPI: {
		getOwnChainAccount: jest.Mock;
	};

	beforeEach(() => {
		const moduleID = MODULE_ID_TOKEN;
		command = new TransferCommand(moduleID);
		interopAPI = {
			getOwnChainAccount: jest.fn().mockResolvedValue({ id: Buffer.from([0, 0, 0, 1]) }),
		};
		const api = new TokenAPI(moduleID);
		api.addDependencies(interopAPI);
		api.init({
			minBalances: [{ tokenID: Buffer.from([0, 0, 0, 1, 0, 0]), amount: BigInt(MIN_BALANCE) }],
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
						tokenID: Buffer.from('000000010000', 'hex'),
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
		const localTokenID = Buffer.from([0, 0, 0, 0, 0, 0]);
		const tokenID = Buffer.from([0, 0, 0, 1, 0, 0]);
		const senderBalance = BigInt(200000000);
		const recipientBalance = BigInt(1000);

		beforeEach(async () => {
			stateStore = new StateStore(new InMemoryKVStore());
			const subStore = stateStore.getStore(MODULE_ID_TOKEN, STORE_PREFIX_USER);
			await subStore.setWithSchema(
				getUserStoreKey(sender.address, localTokenID),
				{ availableBalance: senderBalance, lockedBalances: [] },
				userStoreSchema,
			);
			await subStore.setWithSchema(
				getUserStoreKey(recipient.address, localTokenID),
				{ availableBalance: recipientBalance, lockedBalances: [] },
				userStoreSchema,
			);
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
			).rejects.toThrow('balance 200000000 is not sufficient ');
		});

		it('should reject when sender have enough balance for amount but not for minBalance', async () => {
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
						amount: senderBalance,
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

		it('should reject when recipient exist but does not have enough balance for minBalance', async () => {
			const context = createTransactionContext({
				stateStore,
				transaction: new Transaction({
					moduleID: MODULE_ID_TOKEN,
					commandID: COMMAND_ID_TRANSFER,
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: sender.publicKey,
					params: codec.encode(transferParamsSchema, {
						tokenID,
						amount: recipientBalance + BigInt(1),
						recipientAddress: recipient.address,
						data: '1'.repeat(64),
					}),
					signatures: [getRandomBytes(64)],
				}),
			});
			await expect(
				command.execute(context.createCommandExecuteContext(transferParamsSchema)),
			).rejects.toThrow('balance 2001 is not sufficient for min balance 5000000');
		});

		it('should resolve when recipient does not exist but amount is greater than minBalance', async () => {
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
						amount: BigInt(100000000),
						recipientAddress: getRandomBytes(20),
						data: '1'.repeat(64),
					}),
					signatures: [getRandomBytes(64)],
				}),
			});
			await expect(
				command.execute(context.createCommandExecuteContext(transferParamsSchema)),
			).toResolve();
		});

		it('should resolve when recipient receive enough amount and sender has enough balance', async () => {
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
						amount: BigInt(100000000),
						recipientAddress: recipient.address,
						data: '1'.repeat(64),
					}),
					signatures: [getRandomBytes(64)],
				}),
			});
			await expect(
				command.execute(context.createCommandExecuteContext(transferParamsSchema)),
			).toResolve();
		});
	});
});
