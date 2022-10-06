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

import { Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { TokenModule, VerifyStatus } from '../../../../../src';
import { TokenMethod } from '../../../../../src/modules/token/method';
import { TransferCommand } from '../../../../../src/modules/token/commands/transfer';
import {
	MIN_BALANCE,
	TOKEN_ID_STORE_INITIALIZATION,
	USER_SUBSTORE_INITIALIZATION_FEE,
} from '../../../../../src/modules/token/constants';
import { transferParamsSchema } from '../../../../../src/modules/token/schemas';
import { UserStore } from '../../../../../src/modules/token/stores/user';
import { createTransactionContext } from '../../../../../src/testing';
import { TokenID } from '../../../../../src/modules/token/types';
import { EventQueue } from '../../../../../src/state_machine';
import { InitializeUserAccountEvent } from '../../../../../src/modules/token/events/initialize_user_account';
import { TransferEvent } from '../../../../../src/modules/token/events/transfer';

interface Params {
	tokenID: TokenID;
	amount: bigint;
	recipientAddress: Buffer;
	data: string;
	accountInitializationFee: bigint;
}

describe('Transfer command', () => {
	const feeTokenID = TOKEN_ID_STORE_INITIALIZATION;
	const tokenModule = new TokenModule();
	const ownChainID = Buffer.from([0, 0, 0, 1]);
	const defaultUserAccountInitFee = BigInt('50000000');
	const defaultEscrowAccountInitFee = BigInt('50000000');

	const defaultTokenID = Buffer.concat([ownChainID, Buffer.alloc(4)]);
	const localTokenID = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
	const secondTokenID = Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]);
	const method = new TokenMethod(tokenModule.stores, tokenModule.events, tokenModule.name);
	let command: TransferCommand;
	let interopMethod: {
		getOwnChainAccount: jest.Mock;
		send: jest.Mock;
		error: jest.Mock;
		terminateChain: jest.Mock;
		getChannel: jest.Mock;
	};

	const checkEventResult = (
		eventQueue: EventQueue,
		length: number,
		EventClass: any,
		index: number,
		expectedResult: any,
	) => {
		expect(eventQueue.getEvents()).toHaveLength(length);
		expect(eventQueue.getEvents()[index].toObject().name).toEqual(new EventClass('token').name);

		const eventData = codec.decode<Record<string, unknown>>(
			new EventClass('token').schema,
			eventQueue.getEvents()[index].toObject().data,
		);

		expect(eventData).toEqual({ ...expectedResult, result: 0 });
	};

	beforeEach(() => {
		command = new TransferCommand(tokenModule.stores, tokenModule.events);
		interopMethod = {
			getOwnChainAccount: jest.fn().mockResolvedValue({ chainID: Buffer.from([0, 0, 0, 1]) }),
			send: jest.fn(),
			error: jest.fn(),
			terminateChain: jest.fn(),
			getChannel: jest.fn(),
		};
		method.addDependencies(interopMethod as never);

		method.init({
			ownChainID: Buffer.from([0, 0, 0, 1]),
			escrowAccountInitializationFee: defaultEscrowAccountInitFee,
			userAccountInitializationFee: defaultUserAccountInitFee,
			feeTokenID: defaultTokenID,
			minBalances: [
				{ tokenID: localTokenID, amount: BigInt(MIN_BALANCE) },
				{ tokenID: secondTokenID, amount: BigInt(MIN_BALANCE) },
			],
		});

		command.init({
			method,
			accountInitializationFee: BigInt(USER_SUBSTORE_INITIALIZATION_FEE),
			feeTokenID,
		});
	});

	describe('verify', () => {
		it('should fail when tokenID does not have valid length', async () => {
			const context = createTransactionContext({
				transaction: new Transaction({
					module: 'token',
					command: 'transfer',
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: utils.getRandomBytes(32),
					params: codec.encode(transferParamsSchema, {
						tokenID: Buffer.from('0000000100', 'hex'),
						amount: BigInt(100000000),
						recipientAddress: utils.getRandomBytes(20),
						data: '',
						accountInitializationFee: BigInt(USER_SUBSTORE_INITIALIZATION_FEE),
					}),
					signatures: [utils.getRandomBytes(64)],
				}),
			});
			const result = await command.verify(context.createCommandVerifyContext(transferParamsSchema));

			expect(result.status).toEqual(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(".tokenID' minLength not satisfied");
		});

		it('should fail when recipientAddress is not 20 btyes', async () => {
			const context = createTransactionContext({
				transaction: new Transaction({
					module: 'token',
					command: 'transfer',
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: utils.getRandomBytes(32),
					params: codec.encode(transferParamsSchema, {
						tokenID: Buffer.from('000000010000', 'hex'),
						amount: BigInt(100000000),
						recipientAddress: utils.getRandomBytes(30),
						data: '',
						accountInitializationFee: BigInt(USER_SUBSTORE_INITIALIZATION_FEE),
					}),
					signatures: [utils.getRandomBytes(64)],
				}),
			});
			const result = await command.verify(context.createCommandVerifyContext(transferParamsSchema));

			expect(result.status).toEqual(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(".recipientAddress' address length invalid");
		});

		it('should fail when data is more than 64 characters', async () => {
			const context = createTransactionContext({
				transaction: new Transaction({
					module: 'token',
					command: 'transfer',
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: utils.getRandomBytes(32),
					params: codec.encode(transferParamsSchema, {
						tokenID: Buffer.from('000000010000', 'hex'),
						amount: BigInt(100000000),
						recipientAddress: utils.getRandomBytes(20),
						data: '1'.repeat(65),
						accountInitializationFee: BigInt(USER_SUBSTORE_INITIALIZATION_FEE),
					}),
					signatures: [utils.getRandomBytes(64)],
				}),
			});
			const result = await command.verify(context.createCommandVerifyContext(transferParamsSchema));

			expect(result.status).toEqual(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(".data' must NOT have more than 64 characters");
		});

		it('should success when all parameters are valid', async () => {
			jest
				.spyOn(command['_method'], 'getAvailableBalance')
				.mockResolvedValue(BigInt(100000000 + 1));

			const context = createTransactionContext({
				transaction: new Transaction({
					module: 'token',
					command: 'transfer',
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: utils.getRandomBytes(32),
					params: codec.encode(transferParamsSchema, {
						tokenID: Buffer.from('0000000100000000', 'hex'),
						amount: BigInt(100000000),
						recipientAddress: utils.getRandomBytes(20),
						data: '1'.repeat(64),
						accountInitializationFee: BigInt(USER_SUBSTORE_INITIALIZATION_FEE),
					}),
					signatures: [utils.getRandomBytes(64)],
				}),
			});
			const result = await command.verify(context.createCommandVerifyContext(transferParamsSchema));

			expect(result.status).toEqual(VerifyStatus.OK);
		});

		it('should fail for non existent account when initialization fee is not what is configured in init', async () => {
			const context = createTransactionContext({
				transaction: new Transaction({
					module: 'token',
					command: 'transfer',
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: utils.getRandomBytes(32),
					params: codec.encode(transferParamsSchema, {
						tokenID: Buffer.from('0000000100000000', 'hex'),
						amount: BigInt(100000000),
						recipientAddress: utils.getRandomBytes(20),
						data: '1'.repeat(64),
						accountInitializationFee: BigInt(USER_SUBSTORE_INITIALIZATION_FEE) - BigInt(1),
					}),
					signatures: [utils.getRandomBytes(64)],
				}),
			});
			const result = await command.verify(context.createCommandVerifyContext(transferParamsSchema));
			expect(result.status).toEqual(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Invalid account initialization fee.');
		});

		it('should fail if token balance for feeTokenID is less than the sum of configured initialzation fee and transaction amount', async () => {
			const amount = BigInt(100000000);

			const availableBalance = amount + BigInt(USER_SUBSTORE_INITIALIZATION_FEE) - BigInt(1);

			jest
				.spyOn(command['_method'], 'getAvailableBalance')
				.mockResolvedValue(amount + BigInt(USER_SUBSTORE_INITIALIZATION_FEE) - BigInt(1));

			const context = createTransactionContext({
				transaction: new Transaction({
					module: 'token',
					command: 'transfer',
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: utils.getRandomBytes(32),
					params: codec.encode(transferParamsSchema, {
						tokenID: feeTokenID,
						amount,
						recipientAddress: utils.getRandomBytes(20),
						data: '1'.repeat(64),
						accountInitializationFee: BigInt(USER_SUBSTORE_INITIALIZATION_FEE),
					}),
					signatures: [utils.getRandomBytes(64)],
				}),
			});
			const result = await command.verify(context.createCommandVerifyContext(transferParamsSchema));
			expect(result.status).toEqual(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`balance ${availableBalance} is not sufficient for ${
					amount + BigInt(USER_SUBSTORE_INITIALIZATION_FEE)
				}`,
			);
		});

		it('should pass if token balance for token ID TOKEN_ID_STORE_INITIALIZATION is at least the sum of configured initialization fee and transaction amount', async () => {
			const amount = BigInt(100000000);

			jest
				.spyOn(command['_method'], 'getAvailableBalance')
				.mockResolvedValue(amount + BigInt(USER_SUBSTORE_INITIALIZATION_FEE));

			const context = createTransactionContext({
				transaction: new Transaction({
					module: 'token',
					command: 'transfer',
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: utils.getRandomBytes(32),
					params: codec.encode(transferParamsSchema, {
						tokenID: TOKEN_ID_STORE_INITIALIZATION,
						amount: BigInt(100000000),
						recipientAddress: utils.getRandomBytes(20),
						data: '1'.repeat(64),
						accountInitializationFee: BigInt(USER_SUBSTORE_INITIALIZATION_FEE),
					}),
					signatures: [utils.getRandomBytes(64)],
				}),
			});
			const result = await command.verify(context.createCommandVerifyContext(transferParamsSchema));
			expect(result.status).toEqual(VerifyStatus.OK);
		});

		it('should fail if balance for the provided tokenID is insufficient', async () => {
			const amount = BigInt(100000000);
			const availableBalance = amount - BigInt(1);

			jest.spyOn(command['_method'], 'getAvailableBalance').mockResolvedValue(amount - BigInt(1));

			const context = createTransactionContext({
				transaction: new Transaction({
					module: 'token',
					command: 'transfer',
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: utils.getRandomBytes(32),
					params: codec.encode(transferParamsSchema, {
						tokenID: Buffer.from('0000000100000000', 'hex'),
						amount: BigInt(100000000),
						recipientAddress: utils.getRandomBytes(20),
						data: '1'.repeat(64),
						accountInitializationFee: BigInt(USER_SUBSTORE_INITIALIZATION_FEE),
					}),
					signatures: [utils.getRandomBytes(64)],
				}),
			});
			const result = await command.verify(context.createCommandVerifyContext(transferParamsSchema));
			expect(result.status).toEqual(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`balance ${availableBalance} is not sufficient for ${amount}`,
			);
		});

		it('should pass if balance for the provided tokenID is sufficient', async () => {
			const amount = BigInt(100000000);

			jest.spyOn(command['_method'], 'getAvailableBalance').mockResolvedValue(amount);
			const context = createTransactionContext({
				transaction: new Transaction({
					module: 'token',
					command: 'transfer',
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: utils.getRandomBytes(32),
					params: codec.encode(transferParamsSchema, {
						tokenID: Buffer.from('0000000100000000', 'hex'),
						amount,
						recipientAddress: utils.getRandomBytes(20),
						data: '1'.repeat(64),
						accountInitializationFee: BigInt(USER_SUBSTORE_INITIALIZATION_FEE),
					}),
					signatures: [utils.getRandomBytes(64)],
				}),
			});
			const result = await command.verify(context.createCommandVerifyContext(transferParamsSchema));
			expect(result.status).toEqual(VerifyStatus.OK);
		});
	});

	describe('execute', () => {
		it('should initialize recipient account for tokenID does not exist and transfer the amount from sender to recipient', async () => {
			const amount = BigInt(5);
			const recipientAddress = utils.getRandomBytes(20);
			const tokenID = Buffer.from('0000000100000000', 'hex');
			const userStore = tokenModule.stores.get(UserStore);

			const context = createTransactionContext({
				transaction: new Transaction({
					module: 'token',
					command: 'transfer',
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: utils.getRandomBytes(32),
					params: codec.encode(transferParamsSchema, {
						tokenID,
						amount,
						recipientAddress,
						data: '1'.repeat(64),
						accountInitializationFee: BigInt(USER_SUBSTORE_INITIALIZATION_FEE),
					}),
					signatures: [utils.getRandomBytes(64)],
				}),
			});

			const commandExecuteContext = context.createCommandExecuteContext<Params>(
				transferParamsSchema,
			);

			jest.spyOn(command['_method'], 'burn').mockImplementation(async () => Promise.resolve());

			await userStore.save(commandExecuteContext, context.transaction.senderAddress, tokenID, {
				availableBalance: BigInt(10),
				lockedBalances: [],
			});

			await command.execute(commandExecuteContext);

			const senderAccount = await userStore.get(
				commandExecuteContext,
				userStore.getKey(context.transaction.senderAddress, tokenID),
			);
			const recipientAccount = await userStore.get(
				commandExecuteContext,
				userStore.getKey(recipientAddress, tokenID),
			);

			expect(senderAccount.availableBalance.toString()).toEqual(BigInt(5).toString());
			expect(recipientAccount.availableBalance.toString()).toEqual(BigInt(5).toString());

			expect(command['_method'].burn).toHaveBeenCalledTimes(1);

			checkEventResult(commandExecuteContext.eventQueue, 2, InitializeUserAccountEvent, 0, {
				address: recipientAddress,
				tokenID,
				initPayingAddress: context.transaction.senderAddress,
				initializationFee: BigInt(USER_SUBSTORE_INITIALIZATION_FEE),
			});

			checkEventResult(commandExecuteContext.eventQueue, 2, TransferEvent, 1, {
				senderAddress: context.transaction.senderAddress,
				recipientAddress,
				tokenID,
				amount,
			});
		});

		it('should not initialize existing recipient account for tokenID and transfer the amount from sender to recipient', async () => {
			const amount = BigInt(5);
			const recipientAddress = utils.getRandomBytes(20);
			const tokenID = Buffer.from('0000000100000000', 'hex');
			const userStore = tokenModule.stores.get(UserStore);

			const context = createTransactionContext({
				transaction: new Transaction({
					module: 'token',
					command: 'transfer',
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: utils.getRandomBytes(32),
					params: codec.encode(transferParamsSchema, {
						tokenID,
						amount,
						recipientAddress,
						data: '1'.repeat(64),
						accountInitializationFee: BigInt(USER_SUBSTORE_INITIALIZATION_FEE),
					}),
					signatures: [utils.getRandomBytes(64)],
				}),
			});

			const commandExecuteContext = context.createCommandExecuteContext<Params>(
				transferParamsSchema,
			);

			jest.spyOn(command['_method'], 'burn').mockImplementation(async () => Promise.resolve());

			await userStore.save(commandExecuteContext, context.transaction.senderAddress, tokenID, {
				availableBalance: BigInt(10),
				lockedBalances: [],
			});

			await userStore.save(commandExecuteContext, recipientAddress, tokenID, {
				availableBalance: BigInt(15),
				lockedBalances: [],
			});

			await command.execute(commandExecuteContext);

			const senderAccount = await userStore.get(
				commandExecuteContext,
				userStore.getKey(context.transaction.senderAddress, tokenID),
			);
			const recipientAccount = await userStore.get(
				commandExecuteContext,
				userStore.getKey(recipientAddress, tokenID),
			);

			expect(senderAccount.availableBalance).toEqual(BigInt(5));
			expect(recipientAccount.availableBalance).toEqual(BigInt(20));

			expect(command['_method'].burn).toHaveBeenCalledTimes(0);

			checkEventResult(commandExecuteContext.eventQueue, 1, TransferEvent, 0, {
				senderAddress: context.transaction.senderAddress,
				recipientAddress,
				tokenID,
				amount,
			});
		});

		it('should fail if balance for tokenID is not sufficient', async () => {
			const amount = BigInt(17);
			const recipientAddress = utils.getRandomBytes(20);
			const tokenID = Buffer.from('0000000100000000', 'hex');
			const userStore = tokenModule.stores.get(UserStore);
			const balance = BigInt(10);

			const context = createTransactionContext({
				transaction: new Transaction({
					module: 'token',
					command: 'transfer',
					fee: BigInt(5000000),
					nonce: BigInt(0),
					senderPublicKey: utils.getRandomBytes(32),
					params: codec.encode(transferParamsSchema, {
						tokenID,
						amount,
						recipientAddress,
						data: '1'.repeat(64),
						accountInitializationFee: BigInt(USER_SUBSTORE_INITIALIZATION_FEE),
					}),
					signatures: [utils.getRandomBytes(64)],
				}),
			});

			const commandExecuteContext = context.createCommandExecuteContext<Params>(
				transferParamsSchema,
			);

			jest.spyOn(command['_method'], 'burn').mockImplementation(async () => Promise.resolve());

			await userStore.save(commandExecuteContext, context.transaction.senderAddress, tokenID, {
				availableBalance: balance,
				lockedBalances: [],
			});

			await expect(command.execute(commandExecuteContext)).rejects.toThrow(
				`balance ${balance} is not sufficient for ${amount}.`,
			);
		});
	});
});
