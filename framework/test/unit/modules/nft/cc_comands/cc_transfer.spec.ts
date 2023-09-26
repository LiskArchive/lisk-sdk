/*
 * Copyright © 2023 Lisk Foundation
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
import { NFTModule } from '../../../../../src/modules/nft/module';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing';
import {
	ALL_SUPPORTED_NFTS_KEY,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	FEE_CREATE_NFT,
	LENGTH_CHAIN_ID,
	LENGTH_NFT_ID,
	NftEventResult,
} from '../../../../../src/modules/nft/constants';
import { NFTStore } from '../../../../../src/modules/nft/stores/nft';
import { CCMsg, CrossChainMessageContext, ccuParamsSchema } from '../../../../../src';
import { InternalMethod } from '../../../../../src/modules/nft/internal_method';
import { NFTMethod } from '../../../../../src/modules/nft/method';
import { EventQueue, MethodContext, createMethodContext } from '../../../../../src/state_machine';
import { CrossChainTransferCommand } from '../../../../../src/modules/nft/cc_commands/cc_transfer';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { crossChainNFTTransferMessageParamsSchema } from '../../../../../src/modules/nft/schemas';
import {
	CCM_STATUS_OK,
	CCM_STATUS_PROTOCOL_VIOLATION,
} from '../../../../../src/modules/token/constants';
import { fakeLogger } from '../../../../utils/mocks/logger';
import { CcmTransferEvent } from '../../../../../src/modules/nft/events/ccm_transfer';
import { EscrowStore } from '../../../../../src/modules/nft/stores/escrow';
import { UserStore } from '../../../../../src/modules/nft/stores/user';
import { SupportedNFTsStore } from '../../../../../src/modules/nft/stores/supported_nfts';

describe('CrossChain Transfer Command', () => {
	const module = new NFTModule();
	const method = new NFTMethod(module.stores, module.events);
	const internalMethod = new InternalMethod(module.stores, module.events);
	const feeMethod = { payFee: jest.fn() };
	const tokenMethod = {
		getAvailableBalance: jest.fn(),
	};
	const checkEventResult = (
		eventQueue: EventQueue,
		length: number,
		EventClass: any,
		index: number,
		expectedResult: any,
		result: any = 0,
	) => {
		expect(eventQueue.getEvents()).toHaveLength(length);
		expect(eventQueue.getEvents()[index].toObject().name).toEqual(new EventClass('nft').name);

		const eventData = codec.decode<Record<string, unknown>>(
			new EventClass('nft').schema,
			eventQueue.getEvents()[index].toObject().data,
		);

		expect(eventData).toEqual({ ...expectedResult, result });
	};
	const defaultAddress = utils.getRandomBytes(20);
	const sendingChainID = Buffer.from([1, 1, 1, 1]);
	const receivingChainID = Buffer.from([0, 0, 0, 1]);
	const senderAddress = utils.getRandomBytes(20);
	const recipientAddress = utils.getRandomBytes(20);
	const attributesArray = [{ module: 'pos', attributes: Buffer.alloc(5) }];
	const getStore = (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix);
	const getMethodContext = () => methodContext;
	const eventQueue = new EventQueue(0);
	const contextStore = new Map();
	const nftID = Buffer.alloc(LENGTH_NFT_ID, 1);
	const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
	const ownChainID = Buffer.alloc(LENGTH_CHAIN_ID, 1);
	const config = {
		ownChainID,
		escrowAccountInitializationFee: BigInt(50000000),
		userAccountInitializationFee: BigInt(50000000),
	};
	const interopMethod = {
		send: jest.fn(),
		error: jest.fn(),
		terminateChain: jest.fn(),
		getMessageFeeTokenID: jest.fn(),
	};
	const defaultHeader = {
		height: 0,
		timestamp: 0,
	};
	const defaultEncodedCCUParams = codec.encode(ccuParamsSchema, {
		activeValidatorsUpdate: {
			blsKeysUpdate: [],
			bftWeightsUpdate: [],
			bftWeightsUpdateBitmap: Buffer.alloc(0),
		},
		certificate: Buffer.alloc(1),
		certificateThreshold: BigInt(1),
		inboxUpdate: {
			crossChainMessages: [],
			messageWitnessHashes: [],
			outboxRootWitness: {
				bitmap: Buffer.alloc(1),
				siblingHashes: [],
			},
		},
		sendingChainID: Buffer.from('04000001', 'hex'),
	});
	const defaultTransaction = {
		senderAddress: defaultAddress,
		fee: BigInt(0),
		params: defaultEncodedCCUParams,
	};
	let params: Buffer;
	let ccm: CCMsg;
	let command: CrossChainTransferCommand;
	let methodContext: MethodContext;
	let stateStore: PrefixedStateReadWriter;
	let context: CrossChainMessageContext;
	let nftStore: NFTStore;
	let escrowStore: EscrowStore;
	let userStore: UserStore;

	beforeEach(async () => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		method.addDependencies(interopMethod, internalMethod, feeMethod, tokenMethod);
		method.init(config);
		internalMethod.addDependencies(method, interopMethod);
		internalMethod.init(config);
		command = new CrossChainTransferCommand(module.stores, module.events);
		command.init({ method, internalMethod, feeMethod });
		methodContext = createMethodContext({
			stateStore,
			eventQueue: new EventQueue(0),
			contextStore: new Map(),
		});
		nftStore = module.stores.get(NFTStore);
		await nftStore.save(methodContext, nftID, {
			owner: sendingChainID,
			attributesArray: [],
		});
		params = codec.encode(crossChainNFTTransferMessageParamsSchema, {
			nftID,
			senderAddress,
			recipientAddress,
			attributesArray,
			data: '',
		});
		ccm = {
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
			module: module.name,
			nonce: BigInt(1),
			sendingChainID,
			receivingChainID,
			fee: BigInt(30000),
			status: CCM_STATUS_OK,
			params,
		};
		context = {
			ccm,
			transaction: defaultTransaction,
			header: defaultHeader,
			stateStore,
			contextStore,
			getMethodContext,
			eventQueue: new EventQueue(0),
			getStore,
			logger: fakeLogger,
			chainID: ownChainID,
		};
	});

	describe('verify', () => {
		it('should resolve if verification succeeds', async () => {
			await expect(command.verify(context)).resolves.toBeUndefined();
		});

		it('throw for invalid ccm status', async () => {
			ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: module.name,
				nonce: BigInt(1),
				sendingChainID,
				receivingChainID,
				fee: BigInt(30000),
				status: 72,
				params,
			};
			context = {
				ccm,
				transaction: defaultTransaction,
				header: defaultHeader,
				stateStore,
				contextStore,
				getMethodContext,
				eventQueue,
				getStore,
				logger: fakeLogger,
				chainID,
			};

			await expect(command.verify(context)).rejects.toThrow('Invalid CCM error code');
		});

		it('throw if nft chain id is equal to neither own chain id or sending chain id', async () => {
			const newConfig = {
				ownChainID: utils.getRandomBytes(LENGTH_CHAIN_ID),
				escrowAccountInitializationFee: BigInt(50000000),
				userAccountInitializationFee: BigInt(50000000),
			};
			method.init(newConfig);
			internalMethod.addDependencies(method, interopMethod);
			internalMethod.init(newConfig);
			params = codec.encode(crossChainNFTTransferMessageParamsSchema, {
				nftID: Buffer.alloc(LENGTH_NFT_ID, 1),
				senderAddress,
				recipientAddress,
				attributesArray,
				data: '',
			});
			ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: module.name,
				nonce: BigInt(1),
				sendingChainID: utils.getRandomBytes(LENGTH_CHAIN_ID),
				receivingChainID,
				fee: BigInt(30000),
				status: CCM_STATUS_OK,
				params,
			};
			context = {
				ccm,
				transaction: defaultTransaction,
				header: defaultHeader,
				stateStore,
				contextStore,
				getMethodContext,
				eventQueue,
				getStore,
				logger: fakeLogger,
				chainID: newConfig.ownChainID,
			};

			await expect(command.verify(context)).rejects.toThrow(
				'NFT is not native to either the sending chain or the receiving chain',
			);
		});

		it('should throw if nft chain id equals own chain id but no entry exists in nft substore for the nft id', async () => {
			await nftStore.del(methodContext, nftID);

			await expect(command.verify(context)).rejects.toThrow(
				'Non-existent entry in the NFT substore',
			);
		});

		it('should throw if nft chain id equals own chain id but the owner of nft is different from the sending chain', async () => {
			await nftStore.del(methodContext, nftID);
			await nftStore.save(methodContext, nftID, {
				owner: utils.getRandomBytes(LENGTH_CHAIN_ID),
				attributesArray: [],
			});

			await expect(command.verify(context)).rejects.toThrow('NFT has not been properly escrowed');
		});

		it('should not throw if nft chain id is not equal to own chain id and no entry exists in nft substore for the nft id', async () => {
			const newConfig = {
				ownChainID: utils.getRandomBytes(LENGTH_CHAIN_ID),
				escrowAccountInitializationFee: BigInt(50000000),
				userAccountInitializationFee: BigInt(50000000),
			};
			method.init(newConfig);
			internalMethod.addDependencies(method, interopMethod);
			internalMethod.init(newConfig);
			context = {
				ccm,
				transaction: defaultTransaction,
				header: defaultHeader,
				stateStore,
				contextStore,
				getMethodContext,
				eventQueue: new EventQueue(0),
				getStore,
				logger: fakeLogger,
				chainID: newConfig.ownChainID,
			};
			await nftStore.del(methodContext, nftID);

			await expect(command.verify(context)).resolves.toBeUndefined();
		});

		it('throw if nft chain id is not equal to own chain id and entry already exists in nft substore for the nft id', async () => {
			const newConfig = {
				ownChainID: utils.getRandomBytes(LENGTH_CHAIN_ID),
				escrowAccountInitializationFee: BigInt(50000000),
				userAccountInitializationFee: BigInt(50000000),
			};
			method.init(newConfig);
			internalMethod.addDependencies(method, interopMethod);
			internalMethod.init(newConfig);
			context = {
				ccm,
				transaction: defaultTransaction,
				header: defaultHeader,
				stateStore,
				contextStore,
				getMethodContext,
				eventQueue: new EventQueue(0),
				getStore,
				logger: fakeLogger,
				chainID: newConfig.ownChainID,
			};

			await expect(command.verify(context)).rejects.toThrow('NFT substore entry already exists');
		});
	});

	describe('execute', () => {
		beforeEach(async () => {
			userStore = module.stores.get(UserStore);
			escrowStore = module.stores.get(EscrowStore);
			await escrowStore.set(methodContext, escrowStore.getKey(sendingChainID, nftID), {});
		});

		it('should throw if validation fails', async () => {
			params = codec.encode(crossChainNFTTransferMessageParamsSchema, {
				nftID: Buffer.alloc(LENGTH_NFT_ID, 1),
				senderAddress: utils.getRandomBytes(32),
				recipientAddress,
				attributesArray,
				data: '',
			});
			ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: module.name,
				nonce: BigInt(1),
				sendingChainID,
				receivingChainID,
				fee: BigInt(30000),
				status: CCM_STATUS_OK,
				params,
			};
			context = {
				ccm,
				transaction: defaultTransaction,
				header: defaultHeader,
				stateStore,
				contextStore,
				getMethodContext,
				eventQueue,
				getStore,
				logger: fakeLogger,
				chainID,
			};

			await expect(command.execute(context)).rejects.toThrow(
				`Property '.senderAddress' address length invalid`,
			);
		});

		it('should throw if fail to decode the CCM', async () => {
			ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: module.name,
				nonce: BigInt(1),
				sendingChainID,
				receivingChainID,
				fee: BigInt(30000),
				status: CCM_STATUS_OK,
				params: Buffer.from(''),
			};
			context = {
				ccm,
				transaction: defaultTransaction,
				header: defaultHeader,
				stateStore,
				contextStore,
				getMethodContext,
				eventQueue,
				getStore,
				logger: fakeLogger,
				chainID,
			};

			await expect(command.execute(context)).rejects.toThrow(
				'Message does not contain a property for fieldNumber: 1.',
			);
		});

		it('should set appropriate values to stores and emit appropriate successful ccm transfer event for nft chain id equals own chain id and ccm status code ok', async () => {
			await expect(command.execute(context)).resolves.toBeUndefined();
			const nftStoreData = await nftStore.get(methodContext, nftID);
			const userAccountExists = await userStore.has(
				methodContext,
				userStore.getKey(recipientAddress, nftID),
			);
			const escrowAccountExists = await escrowStore.has(
				methodContext,
				escrowStore.getKey(sendingChainID, nftID),
			);
			expect(nftStoreData.owner).toStrictEqual(recipientAddress);
			expect(nftStoreData.attributesArray).toEqual([]);
			expect(userAccountExists).toBe(true);
			expect(escrowAccountExists).toBe(false);
			checkEventResult(context.eventQueue, 1, CcmTransferEvent, 0, {
				senderAddress,
				recipientAddress,
				nftID,
				receivingChainID: ccm.receivingChainID,
				sendingChainID: ccm.sendingChainID,
			});
		});

		it('should set appropriate values to stores and emit appropriate successful ccm transfer event for nft chain id equals own chain id but not ccm status code ok', async () => {
			ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: module.name,
				nonce: BigInt(1),
				sendingChainID,
				receivingChainID,
				fee: BigInt(30000),
				status: CCM_STATUS_PROTOCOL_VIOLATION,
				params,
			};
			context = {
				ccm,
				transaction: defaultTransaction,
				header: defaultHeader,
				stateStore,
				contextStore,
				getMethodContext,
				eventQueue: new EventQueue(0),
				getStore,
				logger: fakeLogger,
				chainID: ownChainID,
			};

			await expect(command.execute(context)).resolves.toBeUndefined();
			const nftStoreData = await nftStore.get(methodContext, nftID);
			const userAccountExistsForRecipient = await userStore.has(
				methodContext,
				userStore.getKey(recipientAddress, nftID),
			);
			const userAccountExistsForSender = await userStore.has(
				methodContext,
				userStore.getKey(senderAddress, nftID),
			);
			const escrowAccountExists = await escrowStore.has(
				methodContext,
				escrowStore.getKey(sendingChainID, nftID),
			);
			expect(nftStoreData.owner).toStrictEqual(senderAddress);
			expect(nftStoreData.attributesArray).toEqual([]);
			expect(userAccountExistsForRecipient).toBe(false);
			expect(userAccountExistsForSender).toBe(true);
			expect(escrowAccountExists).toBe(false);
			checkEventResult(context.eventQueue, 1, CcmTransferEvent, 0, {
				senderAddress,
				recipientAddress: senderAddress,
				nftID,
				receivingChainID: ccm.receivingChainID,
				sendingChainID: ccm.sendingChainID,
			});
		});

		it('should reject and emit unsuccessful ccm transfer event if nft chain id does not equal own chain id and nft is not supported', async () => {
			const newNftID = utils.getRandomBytes(LENGTH_NFT_ID);
			await nftStore.save(methodContext, newNftID, {
				owner: sendingChainID,
				attributesArray: [],
			});
			params = codec.encode(crossChainNFTTransferMessageParamsSchema, {
				nftID: newNftID,
				senderAddress,
				recipientAddress,
				attributesArray,
				data: '',
			});
			ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: module.name,
				nonce: BigInt(1),
				sendingChainID,
				receivingChainID,
				fee: BigInt(30000),
				status: CCM_STATUS_OK,
				params,
			};
			context = {
				ccm,
				transaction: defaultTransaction,
				header: defaultHeader,
				stateStore,
				contextStore,
				getMethodContext,
				eventQueue: new EventQueue(0),
				getStore,
				logger: fakeLogger,
				chainID,
			};

			await expect(command.execute(context)).rejects.toThrow('Non-supported NFT');
			checkEventResult(
				context.eventQueue,
				1,
				CcmTransferEvent,
				0,
				{
					senderAddress,
					recipientAddress,
					nftID: newNftID,
					receivingChainID: ccm.receivingChainID,
					sendingChainID: ccm.sendingChainID,
				},
				NftEventResult.RESULT_NFT_NOT_SUPPORTED,
			);
		});

		it('should set appropriate values to stores and emit appropriate successful ccm transfer event if nft chain id does not equal own chain id but nft is supported and ccm status code ok', async () => {
			const newConfig = {
				ownChainID: utils.getRandomBytes(LENGTH_CHAIN_ID),
				escrowAccountInitializationFee: BigInt(50000000),
				userAccountInitializationFee: BigInt(50000000),
			};
			method.init(newConfig);
			internalMethod.addDependencies(method, interopMethod);
			internalMethod.init(newConfig);
			context = {
				ccm,
				transaction: defaultTransaction,
				header: defaultHeader,
				stateStore,
				contextStore,
				getMethodContext,
				eventQueue: new EventQueue(0),
				getStore,
				logger: fakeLogger,
				chainID: newConfig.ownChainID,
			};
			const supportedNFTsStore = module.stores.get(SupportedNFTsStore);
			await supportedNFTsStore.set(methodContext, ALL_SUPPORTED_NFTS_KEY, {
				supportedCollectionIDArray: [],
			});
			jest.spyOn(feeMethod, 'payFee');

			await expect(command.execute(context)).resolves.toBeUndefined();
			const nftStoreData = await nftStore.get(methodContext, nftID);
			const userAccountExists = await userStore.has(
				methodContext,
				userStore.getKey(recipientAddress, nftID),
			);
			expect(feeMethod.payFee).toHaveBeenCalledWith(methodContext, BigInt(FEE_CREATE_NFT));
			expect(nftStoreData.owner).toStrictEqual(recipientAddress);
			expect(nftStoreData.attributesArray).toEqual(attributesArray);
			expect(userAccountExists).toBe(true);
			checkEventResult(context.eventQueue, 1, CcmTransferEvent, 0, {
				senderAddress,
				recipientAddress,
				nftID,
				receivingChainID: ccm.receivingChainID,
				sendingChainID: ccm.sendingChainID,
			});
		});

		it('should set appropriate values to stores and emit appropriate successful ccm transfer event if nft chain id does not equal own chain id but nft is supported and not ccm status code ok', async () => {
			const newConfig = {
				ownChainID: utils.getRandomBytes(LENGTH_CHAIN_ID),
				escrowAccountInitializationFee: BigInt(50000000),
				userAccountInitializationFee: BigInt(50000000),
			};
			method.init(newConfig);
			internalMethod.addDependencies(method, interopMethod);
			internalMethod.init(newConfig);
			ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: module.name,
				nonce: BigInt(1),
				sendingChainID,
				receivingChainID,
				fee: BigInt(30000),
				status: CCM_STATUS_PROTOCOL_VIOLATION,
				params,
			};
			context = {
				ccm,
				transaction: defaultTransaction,
				header: defaultHeader,
				stateStore,
				contextStore,
				getMethodContext,
				eventQueue: new EventQueue(0),
				getStore,
				logger: fakeLogger,
				chainID,
			};
			const supportedNFTsStore = module.stores.get(SupportedNFTsStore);
			await supportedNFTsStore.set(methodContext, ALL_SUPPORTED_NFTS_KEY, {
				supportedCollectionIDArray: [],
			});
			jest.spyOn(feeMethod, 'payFee');

			await expect(command.execute(context)).resolves.toBeUndefined();
			const nftStoreData = await nftStore.get(methodContext, nftID);
			const userAccountExistsForRecipient = await userStore.has(
				methodContext,
				userStore.getKey(recipientAddress, nftID),
			);
			const userAccountExistsForSender = await userStore.has(
				methodContext,
				userStore.getKey(senderAddress, nftID),
			);
			expect(feeMethod.payFee).toHaveBeenCalledWith(methodContext, BigInt(FEE_CREATE_NFT));
			expect(nftStoreData.owner).toStrictEqual(senderAddress);
			expect(nftStoreData.attributesArray).toEqual(attributesArray);
			expect(userAccountExistsForRecipient).toBe(false);
			expect(userAccountExistsForSender).toBe(true);
			checkEventResult(context.eventQueue, 1, CcmTransferEvent, 0, {
				senderAddress,
				recipientAddress: senderAddress,
				nftID,
				receivingChainID: ccm.receivingChainID,
				sendingChainID: ccm.sendingChainID,
			});
		});
	});
});
