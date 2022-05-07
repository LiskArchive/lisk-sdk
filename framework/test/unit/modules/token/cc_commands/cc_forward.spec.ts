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

import { StateStore } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { TokenAPI } from '../../../../../src/modules/token/api';
import { CCForwardCommand } from '../../../../../src/modules/token/cc_commands/cc_forward';
import {
	CCM_STATUS_OK,
	CCM_STATUS_PROTOCOL_VIOLATION,
	CCM_STATUS_TOKEN_NOT_SUPPORTED,
	CHAIN_ID_LENGTH,
	CROSS_CHAIN_COMMAND_ID_FORWARD,
	CROSS_CHAIN_COMMAND_ID_TRANSFER,
	EMPTY_BYTES,
	MIN_BALANCE,
	MODULE_ID_TOKEN,
	STORE_PREFIX_AVAILABLE_LOCAL_ID,
	STORE_PREFIX_ESCROW,
	STORE_PREFIX_SUPPLY,
	STORE_PREFIX_USER,
	TOKEN_ID_LENGTH,
} from '../../../../../src/modules/token/constants';
import {
	availableLocalIDStoreSchema,
	crossChainForwardMessageParams,
	escrowStoreSchema,
	supplyStoreSchema,
	userStoreSchema,
} from '../../../../../src/modules/token/schemas';
import { getUserStoreKey } from '../../../../../src/modules/token/utils';
import { EventQueue } from '../../../../../src/node/state_machine';
import { APIContext, createAPIContext } from '../../../../../src/node/state_machine/api_context';
import { fakeLogger } from '../../../../utils/node';

describe('CrossChain Forward command', () => {
	const defaultAddress = getRandomBytes(20);
	const defaultTokenIDAlias = Buffer.alloc(TOKEN_ID_LENGTH, 0);
	const defaultTokenID = Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]);
	const defaultForeignTokenID = Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]);
	const defaultAccount = {
		availableBalance: BigInt(10000000000),
		lockedBalances: [
			{
				moduleID: 12,
				amount: BigInt(100000000),
			},
		],
	};
	const defaultTotalSupply = BigInt('100000000000000');
	const defaultEscrowAmount = BigInt('100000000000');
	const sendingChainID = Buffer.from([3, 0, 0, 0]);

	let command: CCForwardCommand;
	let api: TokenAPI;
	let interopAPI: {
		getOwnChainAccount: jest.Mock;
		send: jest.Mock;
		error: jest.Mock;
		terminateChain: jest.Mock;
		getChannel: jest.Mock;
	};
	let stateStore: StateStore;
	let apiContext: APIContext;

	beforeEach(async () => {
		const moduleID = MODULE_ID_TOKEN;
		api = new TokenAPI(moduleID);
		command = new CCForwardCommand(moduleID, api);
		interopAPI = {
			getOwnChainAccount: jest.fn().mockResolvedValue({ id: Buffer.from([0, 0, 0, 1]) }),
			send: jest.fn(),
			error: jest.fn(),
			terminateChain: jest.fn(),
			getChannel: jest.fn(),
		};
		const minBalances = [
			{ tokenID: defaultTokenIDAlias, amount: BigInt(MIN_BALANCE) },
			{ tokenID: defaultForeignTokenID, amount: BigInt(MIN_BALANCE) },
		];
		api.addDependencies(interopAPI);
		command.addDependencies(interopAPI);
		api.init({
			minBalances,
		});

		stateStore = new StateStore(new InMemoryKVStore());
		apiContext = createAPIContext({
			stateStore: new StateStore(new InMemoryKVStore()),
			eventQueue: new EventQueue(),
		});
		const userStore = apiContext.getStore(MODULE_ID_TOKEN, STORE_PREFIX_USER);
		await userStore.setWithSchema(
			getUserStoreKey(defaultAddress, defaultTokenIDAlias),
			defaultAccount,
			userStoreSchema,
		);
		await userStore.setWithSchema(
			getUserStoreKey(defaultAddress, defaultForeignTokenID),
			defaultAccount,
			userStoreSchema,
		);

		const supplyStore = apiContext.getStore(MODULE_ID_TOKEN, STORE_PREFIX_SUPPLY);
		await supplyStore.setWithSchema(
			defaultTokenIDAlias.slice(CHAIN_ID_LENGTH),
			{ totalSupply: defaultTotalSupply },
			supplyStoreSchema,
		);

		const nextAvailableLocalIDStore = apiContext.getStore(
			MODULE_ID_TOKEN,
			STORE_PREFIX_AVAILABLE_LOCAL_ID,
		);
		await nextAvailableLocalIDStore.setWithSchema(
			EMPTY_BYTES,
			{ nextAvailableLocalID: Buffer.from([0, 0, 0, 5]) },
			availableLocalIDStoreSchema,
		);

		const escrowStore = apiContext.getStore(MODULE_ID_TOKEN, STORE_PREFIX_ESCROW);
		await escrowStore.setWithSchema(
			Buffer.concat([
				defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
				defaultTokenIDAlias.slice(CHAIN_ID_LENGTH),
			]),
			{ amount: defaultEscrowAmount },
			escrowStoreSchema,
		);
		await escrowStore.setWithSchema(
			Buffer.concat([Buffer.from([3, 0, 0, 0]), defaultTokenIDAlias.slice(CHAIN_ID_LENGTH)]),
			{ amount: defaultEscrowAmount },
			escrowStoreSchema,
		);
		jest.spyOn(fakeLogger, 'debug');
	});

	describe('execute', () => {
		it('should terminate chain if token ID is not 8 bytes', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID: Buffer.from([3, 0, 0, 0]),
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(30000),
						status: CCM_STATUS_OK,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: getRandomBytes(9),
							amount: BigInt(1000),
							senderAddress: defaultAddress,
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					ccmLength: 30,
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect((fakeLogger.debug as jest.Mock).mock.calls[0][0].err.message).toInclude(
				"tokenID' maxLength exceeded",
			);
			expect(interopAPI.terminateChain).toHaveBeenCalledWith(
				expect.any(APIContext),
				Buffer.from([3, 0, 0, 0]),
			);
		});

		it('should terminate chain if sender address is not 20 bytes', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(30000),
						status: CCM_STATUS_OK,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: defaultTokenID,
							amount: BigInt(1000),
							senderAddress: getRandomBytes(21),
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					ccmLength: 30,
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect((fakeLogger.debug as jest.Mock).mock.calls[0][0].err.message).toInclude(
				"senderAddress' maxLength exceeded",
			);
			expect(interopAPI.terminateChain).toHaveBeenCalledWith(
				expect.any(APIContext),
				Buffer.from([3, 0, 0, 0]),
			);
		});

		it('should terminate chain if recipient address is not 20 bytes', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(30000),
						status: CCM_STATUS_OK,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: defaultTokenID,
							amount: BigInt(1000),
							senderAddress: defaultAddress,
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: getRandomBytes(19),
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					ccmLength: 30,
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect((fakeLogger.debug as jest.Mock).mock.calls[0][0].err.message).toInclude(
				"recipientAddress' minLength not satisfied",
			);
			expect(interopAPI.terminateChain).toHaveBeenCalledWith(
				expect.any(APIContext),
				Buffer.from([3, 0, 0, 0]),
			);
		});

		it('should terminate chain if data exceeds 64 characters', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(30000),
						status: CCM_STATUS_OK,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: defaultTokenID,
							amount: BigInt(1000),
							senderAddress: defaultAddress,
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd'.repeat(100),
							forwardedMessageFee: BigInt(2000),
						}),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					ccmLength: 30,
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect((fakeLogger.debug as jest.Mock).mock.calls[0][0].err.message).toInclude(
				"data' must NOT have more than 64 characters",
			);
			expect(interopAPI.terminateChain).toHaveBeenCalledWith(
				expect.any(APIContext),
				Buffer.from([3, 0, 0, 0]),
			);
		});

		it('should send error if ccm status is ok', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(3000000),
						status: CCM_STATUS_OK,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: defaultTokenID,
							amount: BigInt(1000),
							senderAddress: defaultAddress,
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd'.repeat(100),
							forwardedMessageFee: BigInt(2000),
						}),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					ccmLength: 30,
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect(interopAPI.terminateChain).toHaveBeenCalledWith(
				expect.any(APIContext),
				sendingChainID,
			);
			expect(interopAPI.error).toHaveBeenCalledWith(
				apiContext,
				expect.anything(),
				CCM_STATUS_PROTOCOL_VIOLATION,
			);
		});

		it('should send terminate chain if status is not ok and token chain is not sending chain', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(3000000),
						status: CCM_STATUS_TOKEN_NOT_SUPPORTED,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: defaultForeignTokenID,
							amount: BigInt(1000),
							senderAddress: defaultAddress,
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					ccmLength: 30,
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect(interopAPI.terminateChain).toHaveBeenCalledWith(
				expect.any(APIContext),
				sendingChainID,
			);
		});

		it('should refund sender if status is not ok and token chain id is sending chain', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID: defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(3000000),
						status: CCM_STATUS_TOKEN_NOT_SUPPORTED,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: defaultForeignTokenID,
							amount: BigInt(1000),
							senderAddress: defaultAddress,
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					ccmLength: 30,
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			await expect(
				api.getAvailableBalance(apiContext, defaultAddress, defaultForeignTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + BigInt(1000) + BigInt(2000));
		});

		it('should terminate sending chain if token chain id is not own chain id', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(3000000),
						status: CCM_STATUS_OK,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: defaultForeignTokenID,
							amount: BigInt(1000),
							senderAddress: defaultAddress,
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					ccmLength: 30,
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect(interopAPI.error).toHaveBeenCalledWith(
				apiContext,
				expect.anything(),
				CCM_STATUS_PROTOCOL_VIOLATION,
			);
			expect(interopAPI.terminateChain).toHaveBeenCalledWith(
				expect.any(APIContext),
				sendingChainID,
			);
		});

		it('should terminate chain if not not enough amount is escrowed', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(3000000),
						status: CCM_STATUS_OK,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: defaultTokenID,
							amount: BigInt(1000) + defaultEscrowAmount,
							senderAddress: defaultAddress,
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					ccmLength: 30,
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect(interopAPI.error).toHaveBeenCalledWith(
				apiContext,
				expect.anything(),
				CCM_STATUS_PROTOCOL_VIOLATION,
			);
			expect(interopAPI.terminateChain).toHaveBeenCalledWith(
				expect.any(APIContext),
				sendingChainID,
			);
		});

		it('should credit amount and fee to sender', async () => {
			jest.spyOn(command['_interopAPI'], 'send').mockResolvedValue(false);
			await expect(
				command.execute({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(3000000),
						status: CCM_STATUS_OK,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: defaultTokenID,
							amount: BigInt(1000),
							senderAddress: defaultAddress,
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					ccmLength: 30,
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			await expect(
				api.getAvailableBalance(apiContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + BigInt(1000) + BigInt(2000));
		});

		it('should send cross chain transfer message', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(3000000),
						status: CCM_STATUS_OK,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: defaultTokenID,
							amount: BigInt(1000),
							senderAddress: defaultAddress,
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					ccmLength: 30,
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect(command['_interopAPI'].send).toHaveBeenCalledWith(
				apiContext,
				defaultAddress,
				MODULE_ID_TOKEN,
				CROSS_CHAIN_COMMAND_ID_TRANSFER,
				Buffer.from([4, 0, 0, 0]),
				BigInt(2000),
				CCM_STATUS_OK,
				expect.any(Buffer),
			);
		});

		it('should update sender balance if sending message was successful', async () => {
			jest.spyOn(command['_interopAPI'], 'send').mockResolvedValue(true);
			await expect(
				command.execute({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(3000000),
						status: CCM_STATUS_OK,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: defaultTokenID,
							amount: BigInt(1000),
							senderAddress: defaultAddress,
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					ccmLength: 30,
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			await expect(
				api.getAvailableBalance(apiContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + BigInt(2000));
		});

		it('should not update sender balance if sending message was not successful', async () => {
			jest.spyOn(command['_interopAPI'], 'send').mockResolvedValue(false);
			await expect(
				command.execute({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(3000000),
						status: CCM_STATUS_OK,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: defaultTokenID,
							amount: BigInt(1000),
							senderAddress: defaultAddress,
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					ccmLength: 30,
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			await expect(
				api.getAvailableBalance(apiContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + BigInt(1000) + BigInt(2000));
		});
	});
});
