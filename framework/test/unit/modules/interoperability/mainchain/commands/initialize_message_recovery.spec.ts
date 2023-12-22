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
import { StateMachine, Modules, Transaction } from '../../../../../../src';
import {
	EMPTY_BYTES,
	EMPTY_HASH,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
} from '../../../../../../src/modules/interoperability/constants';
import {
	InitializeMessageRecoveryCommand,
	MessageRecoveryInitializationParams,
} from '../../../../../../src/modules/interoperability/mainchain/commands/initialize_message_recovery';
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
import { InvalidSMTVerificationEvent } from '../../../../../../src/modules/interoperability/events/invalid_smt_verification';

describe('InitializeMessageRecoveryCommand', () => {
	const interopMod = new Modules.Interoperability.MainchainInteroperabilityModule();
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
		minReturnFeePerByte: MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
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
		minReturnFeePerByte: MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
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

	let command: InitializeMessageRecoveryCommand;
	let stateStore: PrefixedStateReadWriter;

	beforeEach(async () => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		command = new InitializeMessageRecoveryCommand(
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
		let defaultContext: StateMachine.CommandVerifyContext<MessageRecoveryInitializationParams>;

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

		it('should return error if channel data is invalid', async () => {
			const transactionParams = {
				...defaultParams,
				channel: Buffer.alloc(0),
			};
			const encodedTransactionParams = codec.encode(
				Modules.Interoperability.messageRecoveryInitializationParamsSchema,
				transactionParams,
			);
			const context = createTransactionContext({
				transaction: new Transaction({
					...defaultTx,
					command: command.name,
					params: encodedTransactionParams,
				}),
				stateStore,
			}).createCommandVerifyContext<MessageRecoveryInitializationParams>(command.schema);

			await expect(command.verify(context)).rejects.toThrow('Invalid buffer length');
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
			const result = await command.verify(context);

			expect(result.status).toBe(StateMachine.VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Chain ID is not valid.`);
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
			const result = await command.verify(context);

			expect(result.status).toBe(StateMachine.VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Chain ID is not valid.`);
		});

		it('should reject when chain account does not exist', async () => {
			await interopMod.stores.get(ChainAccountStore).del(stateStore, targetChainID);

			const result = await command.verify(defaultContext);

			expect(result.status).toBe(StateMachine.VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Chain is not registered`);
		});

		it('should reject when terminated account does not exist', async () => {
			await interopMod.stores.get(TerminatedStateStore).del(stateStore, targetChainID);

			const result = await command.verify(defaultContext);

			expect(result.status).toBe(StateMachine.VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`not present`);
		});

		it('should reject when terminated outbox account exists', async () => {
			await interopMod.stores.get(TerminatedOutboxStore).set(stateStore, targetChainID, {
				outboxRoot: utils.getRandomBytes(32),
				outboxSize: 10,
				partnerChainInboxSize: 20,
			});

			const result = await command.verify(defaultContext);

			expect(result.status).toBe(StateMachine.VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Terminated outbox account already exists.`);
		});

		it('should resolve when ownchainID !== mainchainID', async () => {
			await interopMod.stores
				.get(OwnChainAccountStore)
				.set(stateStore, EMPTY_BYTES, { ...ownChainAccount, chainID: Buffer.from([2, 2, 2, 2]) });

			await expect(command.verify(defaultContext)).resolves.toEqual({
				status: StateMachine.VerifyStatus.OK,
			});
		});

		it('should resolve when params is valid', async () => {
			await expect(command.verify(defaultContext)).resolves.toEqual({
				status: StateMachine.VerifyStatus.OK,
			});
		});
	});

	describe('execute', () => {
		let executeContext: StateMachine.CommandExecuteContext<MessageRecoveryInitializationParams>;
		beforeEach(() => {
			executeContext = createTransactionContext({
				stateStore,
				transaction: new Transaction({
					...defaultTx,
					command: command.name,
					params: codec.encode(command.schema, {
						...defaultParams,
					}),
				}),
			}).createCommandExecuteContext<MessageRecoveryInitializationParams>(command.schema);
		});

		it('should reject when proof of inclusion is not valid and log SMT verification event', async () => {
			jest.spyOn(SparseMerkleTree.prototype, 'verifyInclusionProof').mockResolvedValue(false);
			jest.spyOn(command['events'].get(InvalidSMTVerificationEvent), 'error');

			await expect(command.execute(executeContext)).rejects.toThrow(
				'Message recovery initialization proof of inclusion is not valid',
			);
			expect(command['events'].get(InvalidSMTVerificationEvent).error).toHaveBeenCalledOnceWith(
				executeContext,
			);
		});

		it('should create terminated outbox account', async () => {
			await interopMod.stores.get(TerminatedOutboxStore).set(stateStore, targetChainID, {
				outboxRoot: utils.getRandomBytes(32),
				outboxSize: 10,
				partnerChainInboxSize: 20,
			});
			jest.spyOn(SparseMerkleTree.prototype, 'verifyInclusionProof').mockResolvedValue(true);
			const queryKey = Buffer.concat([
				interopMod.stores.get(ChannelDataStore).key,
				utils.hash(executeContext.chainID),
			]);

			await expect(command.execute(executeContext)).resolves.toBeUndefined();

			expect(command['internalMethod'].createTerminatedOutboxAccount).toHaveBeenCalledWith(
				expect.anything(),
				defaultParams.chainID,
				storedChannel.outbox.root,
				storedChannel.outbox.size,
				paramsChannel.inbox.size,
			);

			expect(SparseMerkleTree.prototype.verifyInclusionProof).toHaveBeenCalledWith(
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
});
