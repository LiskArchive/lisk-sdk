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

import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { TokenModule } from '../../../../../src';
import { MODULE_NAME_INTEROPERABILITY } from '../../../../../src/modules/interoperability/constants';
import { TokenMethod } from '../../../../../src/modules/token/method';
import { CCForwardCommand } from '../../../../../src/modules/token/cc_commands/cc_forward';
import {
	CCM_STATUS_OK,
	CCM_STATUS_PROTOCOL_VIOLATION,
	CCM_STATUS_TOKEN_NOT_SUPPORTED,
	CHAIN_ID_LENGTH,
	CROSS_CHAIN_COMMAND_NAME_FORWARD,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	TOKEN_ID_LENGTH,
} from '../../../../../src/modules/token/constants';
import { crossChainForwardMessageParams } from '../../../../../src/modules/token/schemas';
import { EscrowStore } from '../../../../../src/modules/token/stores/escrow';
import { SupplyStore } from '../../../../../src/modules/token/stores/supply';
import { UserStore } from '../../../../../src/modules/token/stores/user';
import { EventQueue } from '../../../../../src/state_machine';
import {
	MethodContext,
	createMethodContext,
} from '../../../../../src/state_machine/method_context';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { fakeLogger } from '../../../../utils/mocks';

describe('CrossChain Forward command', () => {
	const tokenModule = new TokenModule();
	const defaultAddress = utils.getRandomBytes(20);
	const defaultTokenIDAlias = Buffer.alloc(TOKEN_ID_LENGTH, 0);
	const defaultTokenID = Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]);
	const defaultForeignTokenID = Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]);
	const defaultAccount = {
		availableBalance: BigInt(10000000000),
		lockedBalances: [
			{
				module: 'dpos',
				amount: BigInt(100000000),
			},
		],
	};
	const defaultTotalSupply = BigInt('100000000000000');
	const defaultEscrowAmount = BigInt('100000000000');
	const sendingChainID = Buffer.from([3, 0, 0, 0]);

	let command: CCForwardCommand;
	let method: TokenMethod;
	let interopMethod: {
		getOwnChainAccount: jest.Mock;
		send: jest.Mock;
		error: jest.Mock;
		terminateChain: jest.Mock;
		getChannel: jest.Mock;
	};
	let stateStore: PrefixedStateReadWriter;
	let methodContext: MethodContext;

	beforeEach(async () => {
		method = new TokenMethod(tokenModule.stores, tokenModule.events, tokenModule.name);
		command = new CCForwardCommand(tokenModule.stores, tokenModule.events, method);
		interopMethod = {
			getOwnChainAccount: jest.fn().mockResolvedValue({ chainID: Buffer.from([0, 0, 0, 1]) }),
			send: jest.fn(),
			error: jest.fn(),
			terminateChain: jest.fn(),
			getChannel: jest.fn(),
		};
		// const minBalances = [
		// 	{ tokenID: defaultTokenIDAlias, amount: BigInt(MIN_BALANCE) },
		// 	{ tokenID: defaultForeignTokenID, amount: BigInt(MIN_BALANCE) },
		// ];
		method.addDependencies(interopMethod as never);
		// command.addDependencies(interopMethod);
		// method.init({
		// 	ownChainID: Buffer.from([0, 0, 0, 1]),
		// 	minBalances,

		// });

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		methodContext = createMethodContext({
			stateStore,
			eventQueue: new EventQueue(0),
		});
		const userStore = tokenModule.stores.get(UserStore);
		await userStore.save(methodContext, defaultAddress, defaultTokenIDAlias, defaultAccount);
		await userStore.save(methodContext, defaultAddress, defaultForeignTokenID, defaultAccount);

		const supplyStore = tokenModule.stores.get(SupplyStore);
		await supplyStore.set(methodContext, defaultTokenIDAlias.slice(CHAIN_ID_LENGTH), {
			totalSupply: defaultTotalSupply,
		});

		const escrowStore = tokenModule.stores.get(EscrowStore);
		await escrowStore.set(
			methodContext,
			Buffer.concat([
				defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
				defaultTokenIDAlias.slice(CHAIN_ID_LENGTH),
			]),
			{ amount: defaultEscrowAmount },
		);
		await escrowStore.set(
			methodContext,
			Buffer.concat([Buffer.from([3, 0, 0, 0]), defaultTokenIDAlias.slice(CHAIN_ID_LENGTH)]),
			{ amount: defaultEscrowAmount },
		);
		jest.spyOn(fakeLogger, 'debug');
	});

	// TODO: Remove in https://github.com/LiskHQ/lisk-sdk/issues/7577
	describe.skip('execute', () => {
		it('should terminate chain if token ID is not 8 bytes', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID: Buffer.from([3, 0, 0, 0]),
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(30000),
						status: CCM_STATUS_OK,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: utils.getRandomBytes(9),
							amount: BigInt(1000),
							senderAddress: defaultAddress,
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					transaction: {
						senderAddress: defaultAddress,
						fee: BigInt(0),
					},
					header: {
						height: 0,
						timestamp: 0,
					},
					stateStore,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect((fakeLogger.debug as jest.Mock).mock.calls[0][0].err.message).toInclude(
				"tokenID' maxLength exceeded",
			);
			expect(interopMethod.terminateChain).toHaveBeenCalledWith(
				expect.any(MethodContext),
				Buffer.from([3, 0, 0, 0]),
			);
		});

		it('should terminate chain if sender address is not 20 bytes', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(30000),
						status: CCM_STATUS_OK,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: defaultTokenID,
							amount: BigInt(1000),
							senderAddress: utils.getRandomBytes(21),
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					transaction: {
						senderAddress: defaultAddress,
						fee: BigInt(0),
					},
					header: {
						height: 0,
						timestamp: 0,
					},
					stateStore,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect((fakeLogger.debug as jest.Mock).mock.calls[0][0].err.message).toInclude(
				"senderAddress' address length invalid",
			);
			expect(interopMethod.terminateChain).toHaveBeenCalledWith(
				expect.any(MethodContext),
				Buffer.from([3, 0, 0, 0]),
			);
		});

		it('should terminate chain if recipient address is not 20 bytes', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
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
							recipientAddress: utils.getRandomBytes(19),
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					transaction: {
						senderAddress: defaultAddress,
						fee: BigInt(0),
					},
					header: {
						height: 0,
						timestamp: 0,
					},
					stateStore,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect((fakeLogger.debug as jest.Mock).mock.calls[0][0].err.message).toInclude(
				"recipientAddress' address length invalid",
			);
			expect(interopMethod.terminateChain).toHaveBeenCalledWith(
				expect.any(MethodContext),
				Buffer.from([3, 0, 0, 0]),
			);
		});

		it('should terminate chain if data exceeds 64 characters', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
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
					transaction: {
						senderAddress: defaultAddress,
						fee: BigInt(0),
					},
					header: {
						height: 0,
						timestamp: 0,
					},
					stateStore,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect((fakeLogger.debug as jest.Mock).mock.calls[0][0].err.message).toInclude(
				"data' must NOT have more than 64 characters",
			);
			expect(interopMethod.terminateChain).toHaveBeenCalledWith(
				expect.any(MethodContext),
				Buffer.from([3, 0, 0, 0]),
			);
		});

		it('should send error if ccm status is ok', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
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
					transaction: {
						senderAddress: defaultAddress,
						fee: BigInt(0),
					},
					header: {
						height: 0,
						timestamp: 0,
					},
					stateStore,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect(interopMethod.terminateChain).toHaveBeenCalledWith(
				expect.any(MethodContext),
				sendingChainID,
			);
			expect(interopMethod.error).toHaveBeenCalledWith(
				methodContext,
				expect.anything(),
				CCM_STATUS_PROTOCOL_VIOLATION,
			);
		});

		it('should send terminate chain if status is not ok and token chain is not sending chain', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
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
					transaction: {
						senderAddress: defaultAddress,
						fee: BigInt(0),
					},
					header: {
						height: 0,
						timestamp: 0,
					},
					stateStore,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect(interopMethod.terminateChain).toHaveBeenCalledWith(
				expect.any(MethodContext),
				sendingChainID,
			);
		});

		it('should refund sender if status is not ok and token chain id is sending chain', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
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
					transaction: {
						senderAddress: defaultAddress,
						fee: BigInt(0),
					},
					header: {
						height: 0,
						timestamp: 0,
					},
					stateStore,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultForeignTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + BigInt(1000) + BigInt(2000));
		});

		it('should terminate sending chain if token chain id is not own chain id', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
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
					transaction: {
						senderAddress: defaultAddress,
						fee: BigInt(0),
					},
					header: {
						height: 0,
						timestamp: 0,
					},
					stateStore,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect(interopMethod.error).toHaveBeenCalledWith(
				methodContext,
				expect.anything(),
				CCM_STATUS_PROTOCOL_VIOLATION,
			);
			expect(interopMethod.terminateChain).toHaveBeenCalledWith(
				expect.any(MethodContext),
				sendingChainID,
			);
		});

		it('should terminate chain if not not enough amount is escrowed', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
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
					transaction: {
						senderAddress: defaultAddress,
						fee: BigInt(0),
					},
					header: {
						height: 0,
						timestamp: 0,
					},
					stateStore,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect(interopMethod.error).toHaveBeenCalledWith(
				methodContext,
				expect.anything(),
				CCM_STATUS_PROTOCOL_VIOLATION,
			);
			expect(interopMethod.terminateChain).toHaveBeenCalledWith(
				expect.any(MethodContext),
				sendingChainID,
			);
		});

		it('should credit amount and fee to sender', async () => {
			jest.spyOn(command['_interopMethod'], 'send').mockResolvedValue(false);
			await expect(
				command.execute({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
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
					transaction: {
						senderAddress: defaultAddress,
						fee: BigInt(0),
					},
					header: {
						height: 0,
						timestamp: 0,
					},
					stateStore,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + BigInt(1000) + BigInt(2000));
		});

		it('should send cross chain transfer message', async () => {
			await expect(
				command.execute({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
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
					transaction: {
						senderAddress: defaultAddress,
						fee: BigInt(0),
					},
					header: {
						height: 0,
						timestamp: 0,
					},
					stateStore,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			expect(command['_interopMethod'].send).toHaveBeenCalledWith(
				methodContext,
				defaultAddress,
				MODULE_NAME_INTEROPERABILITY,
				CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				Buffer.from([4, 0, 0, 0]),
				BigInt(2000),
				CCM_STATUS_OK,
				expect.any(Buffer),
			);
		});

		it('should update sender balance if sending message was successful', async () => {
			jest.spyOn(command['_interopMethod'], 'send').mockResolvedValue(true);
			await expect(
				command.execute({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
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
					transaction: {
						senderAddress: defaultAddress,
						fee: BigInt(0),
					},
					header: {
						height: 0,
						timestamp: 0,
					},
					stateStore,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + BigInt(2000));
		});

		it('should not update sender balance if sending message was not successful', async () => {
			jest.spyOn(command['_interopMethod'], 'send').mockResolvedValue(false);
			await expect(
				command.execute({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
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
					transaction: {
						senderAddress: defaultAddress,
						fee: BigInt(0),
					},
					header: {
						height: 0,
						timestamp: 0,
					},
					stateStore,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + BigInt(1000) + BigInt(2000));
		});
	});
});
