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

import { utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { NFTModule } from '../../../../src/modules/nft/module';
import { InternalMethod } from '../../../../src/modules/nft/internal_method';
import { EventQueue, createMethodContext } from '../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import {
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	LENGTH_ADDRESS,
	LENGTH_CHAIN_ID,
	LENGTH_NFT_ID,
	MODULE_NAME_NFT,
	NFT_NOT_LOCKED,
	LENGTH_TOKEN_ID,
} from '../../../../src/modules/nft/constants';
import { NFTStore } from '../../../../src/modules/nft/stores/nft';
import { MethodContext } from '../../../../src/state_machine/method_context';
import { TransferEvent, TransferEventData } from '../../../../src/modules/nft/events/transfer';
import { UserStore } from '../../../../src/modules/nft/stores/user';
import { EscrowStore } from '../../../../src/modules/nft/stores/escrow';
import { NFTMethod } from '../../../../src/modules/nft/method';
import { InteroperabilityMethod, NFTAttributes } from '../../../../src/modules/nft/types';
import {
	TransferCrossChainEvent,
	TransferCrossChainEventData,
} from '../../../../src/modules/nft/events/transfer_cross_chain';
import { DestroyEvent, DestroyEventData } from '../../../../src/modules/nft/events/destroy';
import { crossChainNFTTransferMessageParamsSchema } from '../../../../src/modules/nft/schemas';

describe('InternalMethod', () => {
	const module = new NFTModule();
	const internalMethod = new InternalMethod(module.stores, module.events);
	const method = new NFTMethod(module.stores, module.events);
	let interoperabilityMethod!: InteroperabilityMethod;
	internalMethod.addDependencies(method, interoperabilityMethod);

	const ownChainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
	internalMethod.init({ ownChainID });

	let methodContext!: MethodContext;

	const checkEventResult = <EventDataType>(
		eventQueue: EventQueue,
		length: number,
		EventClass: any,
		index: number,
		expectedResult: EventDataType,
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

	const userStore = module.stores.get(UserStore);
	const nftStore = module.stores.get(NFTStore);
	const escrowStore = module.stores.get(EscrowStore);

	const address = utils.getRandomBytes(LENGTH_ADDRESS);
	const senderAddress = utils.getRandomBytes(LENGTH_ADDRESS);
	const recipientAddress = utils.getRandomBytes(LENGTH_ADDRESS);
	let nftID = utils.getRandomBytes(LENGTH_NFT_ID);

	beforeEach(() => {
		methodContext = createMethodContext({
			stateStore: new PrefixedStateReadWriter(new InMemoryPrefixedStateDB()),
			eventQueue: new EventQueue(0),
			contextStore: new Map(),
		});
	});

	describe('createEscrowEntry', () => {
		it('should create an entry in EscrowStore', async () => {
			const receivingChainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

			await internalMethod.createEscrowEntry(methodContext, receivingChainID, nftID);

			await expect(
				escrowStore.get(methodContext, escrowStore.getKey(receivingChainID, nftID)),
			).resolves.toEqual({});
		});
	});

	describe('hasDuplicateModuleNames', () => {
		it('should return false when the attributes array is empty', () => {
			const attributesArray: NFTAttributes[] = [];

			expect(internalMethod.hasDuplicateModuleNames(attributesArray)).toBeFalse();
		});

		it('should return false when all module names are unique', () => {
			const attributesArray: NFTAttributes[] = [
				{ module: 'module1', attributes: Buffer.from('attributes1') },
				{ module: 'module2', attributes: Buffer.from('attributes2') },
				{ module: 'module3', attributes: Buffer.from('attributes3') },
			];

			const result = internalMethod.hasDuplicateModuleNames(attributesArray);

			expect(result).toBeFalse();
		});

		it('should return true when there are duplicate module names', () => {
			const attributesArray: NFTAttributes[] = [
				{ module: 'module1', attributes: Buffer.from('attributes1') },
				{ module: 'module1', attributes: Buffer.from('attributes2') },
				{ module: 'module3', attributes: Buffer.from('attributes3') },
			];

			const result = internalMethod.hasDuplicateModuleNames(attributesArray);

			expect(result).toBeTrue();
		});
	});

	describe('createNFTEntry', () => {
		it('should throw for duplicate module names in attributes array', async () => {
			const attributesArray = [
				{
					module: 'token',
					attributes: Buffer.alloc(8, 1),
				},
				{
					module: 'token',
					attributes: Buffer.alloc(8, 2),
				},
			];

			await expect(
				internalMethod.createNFTEntry(methodContext, address, nftID, attributesArray),
			).rejects.toThrow('Invalid attributes array provided');
		});

		it('should create an entry in NFStore with attributes sorted by module if there is no duplicate module name', async () => {
			const unsortedAttributesArray = [
				{
					module: 'token',
					attributes: Buffer.alloc(8, 1),
				},
				{
					module: 'pos',
					attributes: Buffer.alloc(8, 1),
				},
			];

			const sortedAttributesArray = [...unsortedAttributesArray].sort((a, b) =>
				a.module.localeCompare(b.module, 'en'),
			);

			await internalMethod.createNFTEntry(methodContext, address, nftID, unsortedAttributesArray);

			await expect(nftStore.get(methodContext, nftID)).resolves.toEqual({
				owner: address,
				attributesArray: sortedAttributesArray,
			});
		});
	});

	describe('createUserEntry', () => {
		it('should create an entry for an unlocked NFT in UserStore', async () => {
			await expect(
				internalMethod.createUserEntry(methodContext, address, nftID),
			).resolves.toBeUndefined();

			await expect(userStore.get(methodContext, userStore.getKey(address, nftID))).resolves.toEqual(
				{
					lockingModule: NFT_NOT_LOCKED,
				},
			);
		});
	});

	describe('transferInternal', () => {
		it('should transfer NFT from sender to recipient and emit Transfer event', async () => {
			await module.stores.get(NFTStore).save(methodContext, nftID, {
				owner: senderAddress,
				attributesArray: [],
			});

			await userStore.set(methodContext, userStore.getKey(senderAddress, nftID), {
				lockingModule: NFT_NOT_LOCKED,
			});

			await internalMethod.transferInternal(methodContext, recipientAddress, nftID);

			await expect(module.stores.get(NFTStore).get(methodContext, nftID)).resolves.toEqual({
				owner: recipientAddress,
				attributesArray: [],
			});

			await expect(
				userStore.has(methodContext, userStore.getKey(senderAddress, nftID)),
			).resolves.toBeFalse();

			await expect(
				userStore.get(methodContext, userStore.getKey(recipientAddress, nftID)),
			).resolves.toEqual({
				lockingModule: NFT_NOT_LOCKED,
			});

			checkEventResult<TransferEventData>(methodContext.eventQueue, 1, TransferEvent, 0, {
				senderAddress,
				recipientAddress,
				nftID,
			});
		});

		it('should fail if NFT does not exist', async () => {
			await expect(
				internalMethod.transferInternal(methodContext, recipientAddress, nftID),
			).rejects.toThrow('does not exist');
		});
	});

	describe('transferCrossChainInternal', () => {
		let receivingChainID: Buffer;
		const messageFee = BigInt(1000);
		const data = '';
		const timestamp = Math.floor(Date.now() / 1000);

		beforeEach(() => {
			receivingChainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			interoperabilityMethod = {
				send: jest.fn().mockResolvedValue(Promise.resolve()),
				error: jest.fn().mockResolvedValue(Promise.resolve()),
				terminateChain: jest.fn().mockRejectedValue(Promise.resolve()),
				getMessageFeeTokenID: jest
					.fn()
					.mockResolvedValue(Promise.resolve(utils.getRandomBytes(LENGTH_TOKEN_ID))),
			};

			internalMethod.addDependencies(method, interoperabilityMethod);
		});

		describe('if attributes are not included ccm contains empty attributes', () => {
			const includeAttributes = false;

			it('should transfer the ownership of the NFT to the receiving chain and escrow it for a native NFT', async () => {
				const chainID = ownChainID;
				nftID = Buffer.concat([chainID, utils.getRandomBytes(LENGTH_NFT_ID - LENGTH_CHAIN_ID)]);

				const ccmParameters = codec.encode(crossChainNFTTransferMessageParamsSchema, {
					nftID,
					senderAddress,
					recipientAddress,
					attributesArray: [],
					data,
				});

				await nftStore.save(methodContext, nftID, {
					owner: senderAddress,
					attributesArray: [],
				});

				await userStore.set(methodContext, userStore.getKey(senderAddress, nftID), {
					lockingModule: NFT_NOT_LOCKED,
				});

				await expect(
					internalMethod.transferCrossChainInternal(
						methodContext,
						senderAddress,
						recipientAddress,
						nftID,
						receivingChainID,
						messageFee,
						data,
						includeAttributes,
						timestamp,
					),
				).resolves.toBeUndefined();

				await expect(nftStore.get(methodContext, nftID)).resolves.toEqual({
					owner: receivingChainID,
					attributesArray: [],
				});

				await expect(
					userStore.has(methodContext, userStore.getKey(senderAddress, nftID)),
				).resolves.toBeFalse();

				await expect(
					escrowStore.get(methodContext, escrowStore.getKey(receivingChainID, nftID)),
				).resolves.toEqual({});

				checkEventResult<TransferCrossChainEventData>(
					methodContext.eventQueue,
					1,
					TransferCrossChainEvent,
					0,
					{
						senderAddress,
						recipientAddress,
						nftID,
						receivingChainID,
						includeAttributes,
					},
				);

				expect(internalMethod['_interoperabilityMethod'].send).toHaveBeenCalledOnce();
				expect(internalMethod['_interoperabilityMethod'].send).toHaveBeenNthCalledWith(
					1,
					expect.anything(),
					senderAddress,
					MODULE_NAME_NFT,
					CROSS_CHAIN_COMMAND_NAME_TRANSFER,
					receivingChainID,
					messageFee,
					ccmParameters,
					timestamp,
				);
			});

			it('should destroy NFT if the chain ID of the NFT is the same as receiving chain', async () => {
				nftID = Buffer.concat([
					receivingChainID,
					utils.getRandomBytes(LENGTH_NFT_ID - LENGTH_CHAIN_ID),
				]);

				const ccmParameters = codec.encode(crossChainNFTTransferMessageParamsSchema, {
					nftID,
					senderAddress,
					recipientAddress,
					attributesArray: [],
					data,
				});

				await nftStore.save(methodContext, nftID, {
					owner: senderAddress,
					attributesArray: [],
				});

				await userStore.set(methodContext, userStore.getKey(senderAddress, nftID), {
					lockingModule: NFT_NOT_LOCKED,
				});

				await expect(
					internalMethod.transferCrossChainInternal(
						methodContext,
						senderAddress,
						recipientAddress,
						nftID,
						receivingChainID,
						messageFee,
						data,
						includeAttributes,
						timestamp,
					),
				).resolves.toBeUndefined();

				checkEventResult<DestroyEventData>(methodContext.eventQueue, 2, DestroyEvent, 0, {
					address: senderAddress,
					nftID,
				});

				checkEventResult<TransferCrossChainEventData>(
					methodContext.eventQueue,
					2,
					TransferCrossChainEvent,
					1,
					{
						senderAddress,
						recipientAddress,
						nftID,
						receivingChainID,
						includeAttributes,
					},
				);

				expect(internalMethod['_interoperabilityMethod'].send).toHaveBeenCalledOnce();
				expect(internalMethod['_interoperabilityMethod'].send).toHaveBeenNthCalledWith(
					1,
					expect.anything(),
					senderAddress,
					MODULE_NAME_NFT,
					CROSS_CHAIN_COMMAND_NAME_TRANSFER,
					receivingChainID,
					messageFee,
					ccmParameters,
					timestamp,
				);
			});
		});

		describe('if attributes are included ccm contains attributes of the NFT', () => {
			const includeAttributes = true;

			it('should transfer the ownership of the NFT to the receiving chain and escrow it for a native NFT', async () => {
				const chainID = ownChainID;
				nftID = Buffer.concat([chainID, utils.getRandomBytes(LENGTH_NFT_ID - LENGTH_CHAIN_ID)]);

				const attributesArray = [
					{
						module: 'pos',
						attributes: utils.getRandomBytes(20),
					},
				];

				const ccmParameters = codec.encode(crossChainNFTTransferMessageParamsSchema, {
					nftID,
					senderAddress,
					recipientAddress,
					attributesArray,
					data,
				});

				await nftStore.save(methodContext, nftID, {
					owner: senderAddress,
					attributesArray,
				});

				await userStore.set(methodContext, userStore.getKey(senderAddress, nftID), {
					lockingModule: NFT_NOT_LOCKED,
				});

				await expect(
					internalMethod.transferCrossChainInternal(
						methodContext,
						senderAddress,
						recipientAddress,
						nftID,
						receivingChainID,
						messageFee,
						data,
						includeAttributes,
						timestamp,
					),
				).resolves.toBeUndefined();

				await expect(nftStore.get(methodContext, nftID)).resolves.toEqual({
					owner: receivingChainID,
					attributesArray,
				});

				await expect(
					userStore.has(methodContext, userStore.getKey(senderAddress, nftID)),
				).resolves.toBeFalse();

				await expect(
					escrowStore.get(methodContext, escrowStore.getKey(receivingChainID, nftID)),
				).resolves.toEqual({});

				checkEventResult<TransferCrossChainEventData>(
					methodContext.eventQueue,
					1,
					TransferCrossChainEvent,
					0,
					{
						senderAddress,
						recipientAddress,
						nftID,
						receivingChainID,
						includeAttributes,
					},
				);

				expect(internalMethod['_interoperabilityMethod'].send).toHaveBeenCalledOnce();
				expect(internalMethod['_interoperabilityMethod'].send).toHaveBeenNthCalledWith(
					1,
					expect.anything(),
					senderAddress,
					MODULE_NAME_NFT,
					CROSS_CHAIN_COMMAND_NAME_TRANSFER,
					receivingChainID,
					messageFee,
					ccmParameters,
					timestamp,
				);
			});

			it('should destroy NFT if the chain ID of the NFT is the same as receiving chain', async () => {
				nftID = Buffer.concat([
					receivingChainID,
					utils.getRandomBytes(LENGTH_NFT_ID - LENGTH_CHAIN_ID),
				]);

				const attributesArray = [
					{
						module: 'pos',
						attributes: utils.getRandomBytes(20),
					},
				];

				const ccmParameters = codec.encode(crossChainNFTTransferMessageParamsSchema, {
					nftID,
					senderAddress,
					recipientAddress,
					attributesArray,
					data,
				});

				await nftStore.save(methodContext, nftID, {
					owner: senderAddress,
					attributesArray,
				});

				await userStore.set(methodContext, userStore.getKey(senderAddress, nftID), {
					lockingModule: NFT_NOT_LOCKED,
				});

				await expect(
					internalMethod.transferCrossChainInternal(
						methodContext,
						senderAddress,
						recipientAddress,
						nftID,
						receivingChainID,
						messageFee,
						data,
						includeAttributes,
						timestamp,
					),
				).resolves.toBeUndefined();

				checkEventResult<DestroyEventData>(methodContext.eventQueue, 2, DestroyEvent, 0, {
					address: senderAddress,
					nftID,
				});

				checkEventResult<TransferCrossChainEventData>(
					methodContext.eventQueue,
					2,
					TransferCrossChainEvent,
					1,
					{
						senderAddress,
						recipientAddress,
						nftID,
						receivingChainID,
						includeAttributes,
					},
				);

				expect(internalMethod['_interoperabilityMethod'].send).toHaveBeenCalledOnce();
				expect(internalMethod['_interoperabilityMethod'].send).toHaveBeenNthCalledWith(
					1,
					expect.anything(),
					senderAddress,
					MODULE_NAME_NFT,
					CROSS_CHAIN_COMMAND_NAME_TRANSFER,
					receivingChainID,
					messageFee,
					ccmParameters,
					timestamp,
				);
			});
		});
	});
});
