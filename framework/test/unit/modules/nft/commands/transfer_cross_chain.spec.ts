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

import { Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { address, utils } from '@liskhq/lisk-cryptography';
import { NFTModule } from '../../../../../src/modules/nft/module';
import {
	TransferCrossChainCommand,
	Params,
} from '../../../../../src/modules/nft/commands/transfer_cross_chain';
import { crossChainTransferParamsSchema } from '../../../../../src/modules/nft/schemas';
import {
	LENGTH_ADDRESS,
	LENGTH_CHAIN_ID,
	LENGTH_NFT_ID,
	LENGTH_TOKEN_ID,
	NFT_NOT_LOCKED,
} from '../../../../../src/modules/nft/constants';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { EventQueue, VerifyStatus, createMethodContext } from '../../../../../src/state_machine';
import { TokenMethod } from '../../../../../src';
import { MethodContext } from '../../../../../src/state_machine/method_context';
import { NFTStore } from '../../../../../src/modules/nft/stores/nft';
import { UserStore } from '../../../../../src/modules/nft/stores/user';
import * as Token from '../../../../../src/modules/token/stores/user';
import { NFTMethod } from '../../../../../src/modules/nft/method';
import { InteroperabilityMethod } from '../../../../../src/modules/nft/types';
import { createTransactionContext } from '../../../../../src/testing';
import { InternalMethod } from '../../../../../src/modules/nft/internal_method';
import {
	TransferCrossChainEvent,
	TransferCrossChainEventData,
} from '../../../../../src/modules/nft/events/transfer_cross_chain';

describe('TransferCrossChainComand', () => {
	const module = new NFTModule();
	module.stores.register(
		Token.UserStore,
		new Token.UserStore(module.name, module.stores.keys.length + 1),
	);

	const command = new TransferCrossChainCommand(module.stores, module.events);
	const nftMethod = new NFTMethod(module.stores, module.events);
	const tokenMethod = new TokenMethod(module.stores, module.events, module.name);
	const internalMethod = new InternalMethod(module.stores, module.events);
	let interoperabilityMethod!: InteroperabilityMethod;

	const senderPublicKey = utils.getRandomBytes(32);
	const owner = address.getAddressFromPublicKey(senderPublicKey);
	const ownChainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
	const receivingChainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
	const messageFeeTokenID = utils.getRandomBytes(LENGTH_TOKEN_ID);
	const availableBalance = BigInt(1000000);

	const nftStore = module.stores.get(NFTStore);
	const userStore = module.stores.get(UserStore);
	const tokenUserStore = module.stores.get(Token.UserStore);

	let stateStore!: PrefixedStateReadWriter;
	let methodContext!: MethodContext;

	let existingNFT: { nftID: any; owner: any };
	let lockedExistingNFT: { nftID: any; owner: any };
	let escrowedNFT: { nftID: any; owner: any };

	const validParams: Params = {
		nftID: Buffer.alloc(LENGTH_NFT_ID),
		receivingChainID,
		recipientAddress: utils.getRandomBytes(LENGTH_ADDRESS),
		data: '',
		messageFee: BigInt(100000),
		includeAttributes: false,
	};

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

	const createTransactionContextWithOverridingParams = (
		params: Record<string, unknown>,
		txParams: Record<string, unknown> = {},
	) =>
		createTransactionContext({
			chainID: ownChainID,
			stateStore,
			transaction: new Transaction({
				module: module.name,
				command: 'transfer',
				fee: BigInt(5000000),
				nonce: BigInt(0),
				senderPublicKey,
				params: codec.encode(crossChainTransferParamsSchema, {
					...validParams,
					...params,
				}),
				signatures: [utils.getRandomBytes(64)],
				...txParams,
			}),
		});

	beforeEach(async () => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());

		methodContext = createMethodContext({
			stateStore,
			eventQueue: new EventQueue(0),
			contextStore: new Map(),
		});

		interoperabilityMethod = {
			send: jest.fn().mockResolvedValue(Promise.resolve()),
			error: jest.fn().mockResolvedValue(Promise.resolve()),
			terminateChain: jest.fn().mockResolvedValue(Promise.resolve()),
			getMessageFeeTokenID: jest.fn().mockResolvedValue(Promise.resolve(messageFeeTokenID)),
		};

		internalMethod.init({
			ownChainID,
		});

		internalMethod.addDependencies(nftMethod, interoperabilityMethod);

		command.init({ nftMethod, tokenMethod, interoperabilityMethod, internalMethod });

		existingNFT = {
			owner,
			nftID: Buffer.concat([ownChainID, utils.getRandomBytes(LENGTH_NFT_ID - LENGTH_CHAIN_ID)]),
		};

		lockedExistingNFT = {
			owner,
			nftID: Buffer.concat([ownChainID, utils.getRandomBytes(LENGTH_NFT_ID - LENGTH_CHAIN_ID)]),
		};

		escrowedNFT = {
			owner: utils.getRandomBytes(LENGTH_CHAIN_ID),
			nftID: utils.getRandomBytes(LENGTH_NFT_ID),
		};

		await nftStore.save(methodContext, existingNFT.nftID, {
			owner: existingNFT.owner,
			attributesArray: [],
		});

		await userStore.set(methodContext, userStore.getKey(existingNFT.owner, existingNFT.nftID), {
			lockingModule: NFT_NOT_LOCKED,
		});

		await module.stores.get(NFTStore).save(methodContext, lockedExistingNFT.nftID, {
			owner: lockedExistingNFT.owner,
			attributesArray: [],
		});

		await userStore.set(
			methodContext,
			userStore.getKey(lockedExistingNFT.owner, lockedExistingNFT.nftID),
			{
				lockingModule: 'token',
			},
		);

		await module.stores.get(NFTStore).save(methodContext, escrowedNFT.nftID, {
			owner: escrowedNFT.owner,
			attributesArray: [],
		});

		await userStore.set(methodContext, userStore.getKey(escrowedNFT.owner, escrowedNFT.nftID), {
			lockingModule: NFT_NOT_LOCKED,
		});

		await tokenUserStore.set(methodContext, tokenUserStore.getKey(owner, messageFeeTokenID), {
			availableBalance,
			lockedBalances: [],
		});
	});

	describe('verify', () => {
		it('should fail if receiving chain id is same as the own chain id', async () => {
			const receivingChainIDContext = createTransactionContextWithOverridingParams({
				receivingChainID: ownChainID,
			});

			await expect(
				command.verify(
					receivingChainIDContext.createCommandVerifyContext(crossChainTransferParamsSchema),
				),
			).rejects.toThrow('Receiving chain cannot be the sending chain');
		});

		it('should fail if NFT does not exist', async () => {
			const context = createTransactionContextWithOverridingParams({
				nftID: utils.getRandomBytes(LENGTH_NFT_ID),
			});

			await expect(
				command.verify(context.createCommandVerifyContext(crossChainTransferParamsSchema)),
			).rejects.toThrow('NFT substore entry does not exist');
		});

		it('should fail if NFT is escrowed', async () => {
			const context = createTransactionContextWithOverridingParams({
				nftID: escrowedNFT.nftID,
			});

			await expect(
				command.verify(context.createCommandVerifyContext(crossChainTransferParamsSchema)),
			).rejects.toThrow('NFT is escrowed to another chain');
		});

		it('should fail if NFT is not native to either the sending or receiving chain', async () => {
			const nftID = utils.getRandomBytes(LENGTH_ADDRESS);

			const context = createTransactionContextWithOverridingParams({
				nftID,
			});

			await nftStore.save(methodContext, nftID, {
				owner,
				attributesArray: [],
			});

			await expect(
				command.verify(context.createCommandVerifyContext(crossChainTransferParamsSchema)),
			).rejects.toThrow('');
		});

		it('should fail if the owner of the NFT is not the sender', async () => {
			const context = createTransactionContextWithOverridingParams({
				nftID: existingNFT.nftID,
			});

			const nft = await nftStore.get(methodContext, existingNFT.nftID);
			nft.owner = utils.getRandomBytes(LENGTH_ADDRESS);
			await nftStore.save(methodContext, existingNFT.nftID, nft);

			await expect(
				command.verify(context.createCommandVerifyContext(crossChainTransferParamsSchema)),
			).rejects.toThrow('Transfer not initiated by the NFT owner');
		});

		it('should fail if NFT is locked', async () => {
			const context = createTransactionContextWithOverridingParams({
				nftID: lockedExistingNFT.nftID,
			});

			await expect(
				command.verify(context.createCommandVerifyContext(crossChainTransferParamsSchema)),
			).rejects.toThrow('Locked NFTs cannot be transferred');
		});

		it('should fail if senders has insufficient balance of value messageFee and token messageFeeTokenID', async () => {
			const context = createTransactionContextWithOverridingParams({
				messageFeeTokenID,
				messageFee: availableBalance + BigInt(1),
				nftID: existingNFT.nftID,
			});

			await expect(
				command.verify(context.createCommandVerifyContext(crossChainTransferParamsSchema)),
			).rejects.toThrow('Insufficient balance for the message fee');
		});

		it('should verify if NFT is native', async () => {
			const context = createTransactionContextWithOverridingParams({
				nftID: existingNFT.nftID,
			});

			await expect(
				command.verify(context.createCommandVerifyContext(crossChainTransferParamsSchema)),
			).resolves.toEqual({ status: VerifyStatus.OK });
		});

		it('should verify if NFT is native to receiving chain', async () => {
			const nftID = Buffer.concat([
				receivingChainID,
				utils.getRandomBytes(LENGTH_NFT_ID - LENGTH_CHAIN_ID),
			]);

			await nftStore.save(methodContext, nftID, {
				owner,
				attributesArray: [],
			});

			await userStore.set(methodContext, userStore.getKey(owner, nftID), {
				lockingModule: NFT_NOT_LOCKED,
			});

			const context = createTransactionContextWithOverridingParams({
				nftID,
			});

			await expect(
				command.verify(context.createCommandVerifyContext(crossChainTransferParamsSchema)),
			).resolves.toEqual({ status: VerifyStatus.OK });
		});
	});

	describe('execute', () => {
		it('should transfer NFT and emit TransferCrossChainEvent', async () => {
			const context = createTransactionContextWithOverridingParams({
				nftID: existingNFT.nftID,
			});

			await expect(
				command.execute(context.createCommandExecuteContext(crossChainTransferParamsSchema)),
			).resolves.toBeUndefined();

			checkEventResult<TransferCrossChainEventData>(
				context.eventQueue,
				1,
				TransferCrossChainEvent,
				0,
				{
					senderAddress: owner,
					recipientAddress: validParams.recipientAddress,
					receivingChainID: validParams.receivingChainID,
					nftID: existingNFT.nftID,
					includeAttributes: validParams.includeAttributes,
				},
			);
		});
	});
});
