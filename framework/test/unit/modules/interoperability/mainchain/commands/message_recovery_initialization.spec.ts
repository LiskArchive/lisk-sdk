/*
 * Copyright © 2022 Lisk Foundation
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
import { SparseMerkleTree } from '@liskhq/lisk-db';
import {
	CommandVerifyContext,
	MainchainInteroperabilityModule,
	Transaction,
	VerifyStatus,
} from '../../../../../../src';
import { EMPTY_BYTES, EMPTY_HASH } from '../../../../../../src/modules/interoperability/constants';
import {
	MessageRecoveryInitializationCommand,
	MessageRecoveryInitializationParams,
} from '../../../../../../src/modules/interoperability/mainchain/commands/message_recovery_initialization';
import {
	ChainAccountStore,
	ChainStatus,
} from '../../../../../../src/modules/interoperability/stores/chain_account';
import {
	ChannelDataStore,
	channelSchema,
} from '../../../../../../src/modules/interoperability/stores/channel_data';
import { OwnChainAccountStore } from '../../../../../../src/modules/interoperability/stores/own_chain_account';
import { TerminatedOutboxStore } from '../../../../../../src/modules/interoperability/stores/terminated_outbox';
import { TerminatedStateStore } from '../../../../../../src/modules/interoperability/stores/terminated_state';
import { OwnChainAccount } from '../../../../../../src/modules/interoperability/types';
import { PrefixedStateReadWriter } from '../../../../../../src/state_machine/prefixed_state_read_writer';
import { createTransactionContext, InMemoryPrefixedStateDB } from '../../../../../../src/testing';

describe('MessageRecoveryInitializationCommand', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const targetChainID = Buffer.from([0, 0, 3, 0]);
	const ownChainAccount: OwnChainAccount = {
		chainID: Buffer.from([0, 0, 2, 0]),
		name: 'ownchain',
		nonce: BigInt(4),
	};
	const defaultTx = {
		module: interopMod.name,
		fee: BigInt(100),
		nonce: BigInt(100),
		senderPublicKey: utils.getRandomBytes(32),
		signatures: [],
	};
	const paramsChannel = {
		inbox: {
			appendPath: [],
			root: utils.getRandomBytes(32),
			size: 2,
		},
		messageFeeTokenID: Buffer.concat([targetChainID, Buffer.alloc(4)]),
		outbox: {
			appendPath: [],
			root: utils.getRandomBytes(32),
			size: 4,
		},
		partnerChainOutboxRoot: utils.getRandomBytes(32),
	};
	const storedChannel = {
		inbox: {
			appendPath: [],
			root: utils.getRandomBytes(32),
			size: 99,
		},
		messageFeeTokenID: Buffer.concat([targetChainID, Buffer.alloc(4)]),
		outbox: {
			appendPath: [],
			root: utils.getRandomBytes(32),
			size: 100,
		},
		partnerChainOutboxRoot: utils.getRandomBytes(32),
	};
	const defaultParams = {
		chainID: targetChainID,
		channel: codec.encode(channelSchema, paramsChannel),
		bitmap: utils.getRandomBytes(2),
		siblingHashes: [utils.getRandomBytes(32)],
	};
	const terminatedState = {
		stateRoot: utils.getRandomBytes(32),
		initialized: true,
		mainchainStateRoot: EMPTY_HASH,
	};

	let command: MessageRecoveryInitializationCommand;
	let stateStore: PrefixedStateReadWriter;

	beforeEach(async () => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		command = new MessageRecoveryInitializationCommand(
			interopMod.stores,
			interopMod.events,
			new Map(),
			new Map(),
			{
				createTerminatedOutboxAccount: jest.fn(),
			} as never,
		);

		await interopMod.stores.get(OwnChainAccountStore).set(stateStore, EMPTY_BYTES, ownChainAccount);
		await interopMod.stores.get(ChainAccountStore).set(stateStore, targetChainID, {
			lastCertificate: {
				height: 0,
				stateRoot: utils.getRandomBytes(32),
				timestamp: 0,
				validatorsHash: utils.getRandomBytes(32),
			},
			name: 'random',
			status: ChainStatus.ACTIVE,
		});
		await interopMod.stores
			.get(TerminatedStateStore)
			.set(stateStore, targetChainID, terminatedState);
		await interopMod.stores.get(ChannelDataStore).set(stateStore, targetChainID, storedChannel);
		jest.spyOn(SparseMerkleTree.prototype, 'verify').mockResolvedValue(true);
	});

	describe('verify', () => {
		let defaultContext: CommandVerifyContext<MessageRecoveryInitializationParams>;

		beforeEach(() => {
			defaultContext = createTransactionContext({
				stateStore,
				transaction: new Transaction({
					...defaultTx,
					command: command.name,
					params: codec.encode(command.schema, {
						...defaultParams,
					}),
				}),
			}).createCommandVerifyContext<MessageRecoveryInitializationParams>(command.schema);
		});

		it('should reject when chainID is the mainchain', async () => {
			const context = createTransactionContext({
				stateStore,
				transaction: new Transaction({
					...defaultTx,
					command: command.name,
					params: codec.encode(command.schema, {
						...defaultParams,
						chainID: Buffer.from([0, 0, 0, 0]),
					}),
				}),
			}).createCommandVerifyContext<MessageRecoveryInitializationParams>(command.schema);
			await expect(command.verify(context)).rejects.toThrow('Chain ID is not valid.');
		});

		it('should reject when chainID is the ownchain', async () => {
			const context = createTransactionContext({
				stateStore,
				transaction: new Transaction({
					...defaultTx,
					command: command.name,
					params: codec.encode(command.schema, {
						...defaultParams,
						chainID: ownChainAccount.chainID,
					}),
				}),
			}).createCommandVerifyContext<MessageRecoveryInitializationParams>(command.schema);
			await expect(command.verify(context)).rejects.toThrow('Chain ID is not valid.');
		});

		it('should reject when chain account does not exist', async () => {
			await interopMod.stores.get(ChainAccountStore).del(stateStore, targetChainID);

			await expect(command.verify(defaultContext)).rejects.toThrow('Chain is not registered');
		});

		it('should reject when terminated account does not exist', async () => {
			await interopMod.stores.get(TerminatedStateStore).del(stateStore, targetChainID);

			await expect(command.verify(defaultContext)).rejects.toThrow('does not exist');
		});

		it('should reject when terminated account exists but not initialized', async () => {
			await interopMod.stores.get(TerminatedStateStore).set(stateStore, targetChainID, {
				stateRoot: utils.getRandomBytes(32),
				initialized: false,
				mainchainStateRoot: EMPTY_HASH,
			});

			await expect(command.verify(defaultContext)).rejects.toThrow('Chain is not terminated.');
		});

		it('should reject when terminated outbox account exists', async () => {
			await interopMod.stores.get(TerminatedOutboxStore).set(stateStore, targetChainID, {
				outboxRoot: utils.getRandomBytes(32),
				outboxSize: 10,
				partnerChainInboxSize: 20,
			});

			await expect(command.verify(defaultContext)).rejects.toThrow(
				'Terminated outbox account already exists.',
			);
		});

		it('should reject when proof of inclusion is not valid', async () => {
			jest.spyOn(SparseMerkleTree.prototype, 'verify').mockResolvedValue(false);

			await expect(command.verify(defaultContext)).rejects.toThrow(
				'Message recovery initialization proof of inclusion is not valid.',
			);
		});

		it('should resolve when params is valid', async () => {
			const queryKey = Buffer.concat([
				interopMod.stores.get(ChannelDataStore).key,
				utils.hash(Buffer.from([0, 0, 0, 0])),
			]);

			await expect(command.verify(defaultContext)).resolves.toEqual({ status: VerifyStatus.OK });
			expect(SparseMerkleTree.prototype.verify).toHaveBeenCalledWith(
				terminatedState.stateRoot,
				[queryKey],
				{
					siblingHashes: defaultParams.siblingHashes,
					queries: [
						{
							key: queryKey,
							value: utils.hash(defaultParams.channel),
							bitmap: defaultParams.bitmap,
						},
					],
				},
			);
		});
	});

	describe('execute', () => {
		it('should create terminated outbox account', async () => {
			const context = createTransactionContext({
				stateStore,
				transaction: new Transaction({
					...defaultTx,
					command: command.name,
					params: codec.encode(command.schema, {
						...defaultParams,
					}),
				}),
			}).createCommandExecuteContext<MessageRecoveryInitializationParams>(command.schema);
			await expect(command.execute(context)).resolves.toBeUndefined();

			expect(command['internalMethod'].createTerminatedOutboxAccount).toHaveBeenCalledWith(
				expect.anything(),
				defaultParams.chainID,
				storedChannel.outbox.root,
				storedChannel.outbox.size,
				paramsChannel.inbox.size,
			);
		});
	});
});
