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
/* eslint-disable max-classes-per-file */
import { utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	MainchainInteroperabilityModule,
	Transaction,
} from '../../../../src';
import { BaseCCCommand } from '../../../../src/modules/interoperability/base_cc_command';
import { BaseCrossChainUpdateCommand } from '../../../../src/modules/interoperability/base_cross_chain_update_command';
import { BaseCCMethod } from '../../../../src/modules/interoperability/base_cc_method';
import {
	BLS_PUBLIC_KEY_LENGTH,
	CCMStatusCode,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
	HASH_LENGTH,
	MIN_RETURN_FEE,
	MODULE_NAME_INTEROPERABILITY,
	EMPTY_BYTES,
} from '../../../../src/modules/interoperability/constants';
import {
	CCMProcessedCode,
	CcmProcessedEvent,
	CCMProcessedResult,
} from '../../../../src/modules/interoperability/events/ccm_processed';
import { CcmSendSuccessEvent } from '../../../../src/modules/interoperability/events/ccm_send_success';
import {
	CrossChainMessageContext,
	CrossChainUpdateTransactionParams,
} from '../../../../src/modules/interoperability/types';
import {
	createCrossChainMessageContext,
	createTransactionContext,
	InMemoryPrefixedStateDB,
} from '../../../../src/testing';
import {
	ccmSchema,
	crossChainUpdateTransactionParams,
} from '../../../../src/modules/interoperability/schemas';
import { certificateSchema } from '../../../../src/engine/consensus/certificate_generation/schema';
import {
	ChainAccountStore,
	ChainStatus,
} from '../../../../src/modules/interoperability/stores/chain_account';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { ChainValidatorsStore } from '../../../../src/modules/interoperability/stores/chain_validators';
import { ChannelDataStore } from '../../../../src/modules/interoperability/stores/channel_data';
import { MainchainInteroperabilityInternalMethod } from '../../../../src/modules/interoperability/mainchain/internal_method';
import { getMainchainID } from '../../../../src/modules/interoperability/utils';
import { BaseInteroperabilityInternalMethod } from '../../../../src/modules/interoperability/base_interoperability_internal_methods';
import { CROSS_CHAIN_COMMAND_NAME_TRANSFER } from '../../../../src/modules/token/constants';

class CrossChainUpdateCommand extends BaseCrossChainUpdateCommand<MainchainInteroperabilityInternalMethod> {
	// eslint-disable-next-line @typescript-eslint/require-await
	public async execute(_context: CommandExecuteContext<unknown>): Promise<void> {
		throw new Error('Method not implemented.');
	}
}

describe('BaseCrossChainUpdateCommand', () => {
	const interopsModule = new MainchainInteroperabilityModule();
	const senderPublicKey = utils.getRandomBytes(32);
	const messageFeeTokenID = Buffer.alloc(8, 0);
	const chainID = Buffer.alloc(4, 0);
	const defaultTransaction = {
		fee: BigInt(0),
		module: interopsModule.name,
		nonce: BigInt(1),
		senderPublicKey,
		signatures: [],
	};
	const zeroValueCCM = {
		crossChainCommand: '',
		fee: BigInt(0),
		module: '',
		nonce: BigInt(0),
		params: EMPTY_BYTES,
		receivingChainID: EMPTY_BYTES,
		sendingChainID: EMPTY_BYTES,
		status: 0,
	};
	const defaultSendingChainID = Buffer.from([0, 0, 2, 0]);
	const params = {
		activeValidatorsUpdate: [
			{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(1) },
			{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(3) },
			{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(4) },
			{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(3) },
		].sort((v1, v2) => v1.blsKey.compare(v2.blsKey)),
		certificate: codec.encode(certificateSchema, {
			blockID: utils.getRandomBytes(32),
			height: 21,
			timestamp: Math.floor(Date.now() / 1000),
			stateRoot: utils.getRandomBytes(HASH_LENGTH),
			validatorsHash: utils.getRandomBytes(48),
			aggregationBits: utils.getRandomBytes(38),
			signature: utils.getRandomBytes(32),
		}),
		inboxUpdate: {
			crossChainMessages: [
				{
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
					fee: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					nonce: BigInt(1),
					params: Buffer.alloc(2),
					receivingChainID: Buffer.from([0, 0, 0, 2]),
					sendingChainID: defaultSendingChainID,
					status: CCMStatusCode.OK,
				},
				{
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
					fee: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					nonce: BigInt(1),
					params: Buffer.alloc(2),
					receivingChainID: chainID,
					sendingChainID: defaultSendingChainID,
					status: CCMStatusCode.OK,
				},
				{
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
					fee: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					nonce: BigInt(1),
					params: Buffer.alloc(2),
					receivingChainID: Buffer.from([0, 0, 0, 4]),
					sendingChainID: defaultSendingChainID,
					status: CCMStatusCode.OK,
				},
			].map(ccm => codec.encode(ccmSchema, ccm)),
			messageWitnessHashes: [Buffer.alloc(32)],
			outboxRootWitness: {
				bitmap: Buffer.alloc(1),
				siblingHashes: [Buffer.alloc(32)],
			},
		},
		certificateThreshold: BigInt(20),
		sendingChainID: defaultSendingChainID,
	};
	const partnerChainAccount = {
		lastCertificate: {
			height: 10,
			stateRoot: utils.getRandomBytes(38),
			timestamp: Math.floor(Date.now() / 1000),
			validatorsHash: utils.getRandomBytes(48),
		},
		name: 'sidechain1',
		status: ChainStatus.ACTIVE,
	};
	const partnerChannel = {
		inbox: {
			appendPath: [Buffer.alloc(32), Buffer.alloc(32)],
			root: utils.getRandomBytes(32),
			size: 18,
		},
		messageFeeTokenID: Buffer.from('0000000000000011', 'hex'),
		outbox: {
			appendPath: [Buffer.alloc(32), Buffer.alloc(32)],
			root: utils.getRandomBytes(32),
			size: 18,
		},
		partnerChainOutboxRoot: utils.getRandomBytes(32),
	};
	const defaultCCM = {
		nonce: BigInt(0),
		module: 'token',
		crossChainCommand: 'crossChainTransfer',
		sendingChainID: Buffer.from([0, 0, 2, 0]),
		receivingChainID: Buffer.from([0, 0, 3, 0]),
		fee: BigInt(20000),
		status: 0,
		params: Buffer.alloc(0),
	};
	let context: CrossChainMessageContext;
	let command: CrossChainUpdateCommand;
	let ccMethods: Map<string, BaseCCMethod>;
	let ccCommands: Map<string, BaseCCCommand[]>;
	let internalMethod: MainchainInteroperabilityInternalMethod;

	beforeEach(() => {
		const interopsModuleule = new MainchainInteroperabilityModule();
		ccMethods = new Map();
		ccMethods.set(
			'token',
			new (class TokenMethod extends BaseCCMethod {
				public verifyCrossChainMessage = jest.fn();
				public beforeCrossChainCommandExecute = jest.fn();
				public afterCrossChainCommandExecute = jest.fn();
			})(interopsModuleule.stores, interopsModuleule.events),
		);
		ccCommands = new Map();
		ccCommands.set('token', [
			new (class CrossChainTransfer extends BaseCCCommand {
				public verify = jest.fn();
				public execute = jest.fn();
			})(interopsModuleule.stores, interopsModuleule.events),
		]);

		internalMethod = {
			isLive: jest.fn().mockResolvedValue(true),
			addToOutbox: jest.fn(),
			terminateChainInternal: jest.fn(),
			verifyCertificate: jest.fn(),
			verifyCertificateSignature: jest.fn(),
			verifyValidatorsUpdate: jest.fn(),
			verifyPartnerChainOutboxRoot: jest.fn(),
			updateValidators: jest.fn(),
			updateCertificate: jest.fn(),
		} as unknown as BaseInteroperabilityInternalMethod;
		command = new CrossChainUpdateCommand(
			interopsModuleule.stores,
			interopsModuleule.events,
			ccMethods,
			ccCommands,
			internalMethod,
		);

		jest.spyOn(command['events'].get(CcmProcessedEvent), 'log');
		jest.spyOn(command['events'].get(CcmSendSuccessEvent), 'log');

		command.init(
			{
				getMessageFeeTokenID: jest.fn().mockResolvedValue(messageFeeTokenID),
			} as any,
			{
				initializeUserAccount: jest.fn(),
			},
		);
		context = createCrossChainMessageContext({
			ccm: defaultCCM,
		});
	});

	describe('verifyCommon', () => {
		let verifyContext: CommandVerifyContext<CrossChainUpdateTransactionParams>;
		let stateStore: PrefixedStateReadWriter;

		beforeEach(async () => {
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			verifyContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: command.name,
					params: codec.encode(crossChainUpdateTransactionParams, params),
				}),
			}).createCommandVerifyContext(command.schema);
			await interopsModule.stores
				.get(ChainAccountStore)
				.set(stateStore, defaultSendingChainID, partnerChainAccount);
			await interopsModule.stores.get(ChainValidatorsStore).set(stateStore, defaultSendingChainID, {
				activeValidators: params.activeValidatorsUpdate,
				certificateThreshold: params.certificateThreshold,
			});
		});

		it('should reject when sending chain status is registered but certificate is empty', async () => {
			await interopsModule.stores.get(ChainAccountStore).set(stateStore, params.sendingChainID, {
				...partnerChainAccount,
				status: ChainStatus.REGISTERED,
			});

			await expect(
				command['verifyCommon']({
					...verifyContext,
					params: {
						...params,
						certificate: Buffer.alloc(0),
					},
				}),
			).rejects.toThrow(
				'Cross-chain updates from chains with status CHAIN_STATUS_REGISTERED must contain a non-empty certificate',
			);
		});

		it('should verify validators update when active validator update exist', async () => {
			await expect(
				command['verifyCommon']({
					...verifyContext,
					params: {
						...params,
						activeValidatorsUpdate: [
							{ bftWeight: BigInt(0), blsKey: utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH) },
						],
					},
				}),
			).resolves.toBeUndefined();

			expect(internalMethod.verifyValidatorsUpdate).toHaveBeenCalledTimes(1);
		});

		it('should verify validators update when certificate threshold changes', async () => {
			await expect(
				command['verifyCommon']({
					...verifyContext,
					params: {
						...params,
						certificateThreshold: BigInt(1),
					},
				}),
			).resolves.toBeUndefined();

			expect(internalMethod.verifyValidatorsUpdate).toHaveBeenCalledTimes(1);
		});

		it('should verify partnerchain outbox root when inbox is not empty', async () => {
			await expect(
				command['verifyCommon']({
					...verifyContext,
					params: {
						...params,
						inboxUpdate: {
							crossChainMessages: [utils.getRandomBytes(100)],
							messageWitnessHashes: [utils.getRandomBytes(32)],
							outboxRootWitness: {
								bitmap: utils.getRandomBytes(2),
								siblingHashes: [utils.getRandomBytes(32)],
							},
						},
					},
				}),
			).resolves.toBeUndefined();

			expect(internalMethod.verifyPartnerChainOutboxRoot).toHaveBeenCalledTimes(1);
		});
	});

	// CAUTION!
	// tests should be written/executed as per `BaseCrossChainUpdateCommand::executeCommon`,
	// otherwise, they can fail due to some other check
	// also, we can simplify test cases by giving only one CCM to params.inboxUpdate.crossChainMessages array
	describe('executeCommon', () => {
		let executeContext: CommandExecuteContext<CrossChainUpdateTransactionParams>;
		let stateStore: PrefixedStateReadWriter;

		beforeEach(async () => {
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());

			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: command.name,
					params: codec.encode(crossChainUpdateTransactionParams, params),
				}),
			}).createCommandExecuteContext(command.schema);
			jest.spyOn(interopsModule.events.get(CcmProcessedEvent), 'log');
			await interopsModule.stores
				.get(ChainAccountStore)
				.set(stateStore, defaultSendingChainID, partnerChainAccount);
			await interopsModule.stores.get(ChainValidatorsStore).set(stateStore, defaultSendingChainID, {
				activeValidators: params.activeValidatorsUpdate,
				certificateThreshold: params.certificateThreshold,
			});
			await interopsModule.stores
				.get(ChannelDataStore)
				.set(stateStore, defaultSendingChainID, partnerChannel);
		});

		it('should verify certificate signature', async () => {
			await expect(command['executeCommon'](executeContext, true)).resolves.toEqual([
				expect.toBeArrayOfSize(params.inboxUpdate.crossChainMessages.length),
				true,
			]);
			expect(internalMethod.verifyCertificateSignature).toHaveBeenCalledTimes(1);
		});

		it('should initialize user account for message fee token ID when inboxUpdate is not empty', async () => {
			await expect(command['executeCommon'](executeContext, true)).resolves.toEqual([
				expect.toBeArrayOfSize(params.inboxUpdate.crossChainMessages.length),
				true,
			]);
			expect(command['_interopsMethod'].getMessageFeeTokenID).toHaveBeenCalledWith(
				expect.anything(),
				params.sendingChainID,
			);
			expect(command['_tokenMethod'].initializeUserAccount).toHaveBeenCalledWith(
				expect.anything(),
				executeContext.transaction.senderAddress,
				messageFeeTokenID,
			);
		});

		it('should not initialize user account for message fee token ID when inboxUpdate is empty', async () => {
			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: command.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
						inboxUpdate: {
							crossChainMessages: [],
							messageWitnessHashes: [],
							outboxRootWitness: {
								bitmap: Buffer.alloc(0),
								siblingHashes: [],
							},
						},
					}),
				}),
			}).createCommandExecuteContext(command.schema);

			await expect(command['executeCommon'](executeContext, true)).resolves.toEqual([[], true]);
			expect(command['_interopsMethod'].getMessageFeeTokenID).not.toHaveBeenCalled();
			expect(command['_tokenMethod'].initializeUserAccount).not.toHaveBeenCalled();
		});

		it('should terminate the chain and add an event when ccm format is invalid', async () => {
			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: command.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
						inboxUpdate: {
							...params.inboxUpdate,
							crossChainMessages: [
								...params.inboxUpdate.crossChainMessages,
								codec.encode(ccmSchema, {
									crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
									fee: BigInt(0),
									module: '___INVALID___NAME___',
									nonce: BigInt(1),
									params: utils.getRandomBytes(10),
									receivingChainID: utils.intToBuffer(2, 4),
									sendingChainID: defaultSendingChainID,
									status: CCMStatusCode.OK,
								}),
							],
						},
					}),
				}),
			}).createCommandExecuteContext(command.schema);

			await expect(command['executeCommon'](executeContext, true)).resolves.toEqual([[], false]);
			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				expect.anything(),
				params.sendingChainID,
			);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				params.sendingChainID,
				chainID,
				{
					ccm: zeroValueCCM,
					code: CCMProcessedCode.INVALID_CCM_VALIDATION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		// after `validateFormat`, we should check `!context.chainID.equals(ccm.receivingChainID)`
		it('should terminate the chain and add an event when CCM is not directed to the sidechain', async () => {
			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: command.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
						inboxUpdate: {
							...params.inboxUpdate,
							crossChainMessages: [
								codec.encode(ccmSchema, {
									crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
									fee: BigInt(0),
									module: MODULE_NAME_INTEROPERABILITY,
									nonce: BigInt(1),
									params: utils.getRandomBytes(10),
									// will fail for `!context.chainID.equals(ccm.receivingChainID)`
									receivingChainID: Buffer.from([0, 0, 3, 0]), //
									sendingChainID: defaultSendingChainID,
									status: CCMStatusCode.OK,
								}),
							],
						},
					}),
				}),
			}).createCommandExecuteContext(command.schema);

			await expect(command['executeCommon'](executeContext, false)).resolves.toEqual([[], false]);
			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				expect.anything(),
				params.sendingChainID,
			);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				params.sendingChainID,
				chainID,
				{
					ccm: zeroValueCCM,
					code: CCMProcessedCode.INVALID_CCM_VALIDATION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		// next, we should check `!ccm.sendingChainID.equals(params.sendingChainID)`
		// params.sendingChainID is defaultSendingChainID (Buffer.from([0, 0, 2, 0])
		it('should terminate the chain and add an event when CCM sending chain and ccu sending chain is not the same', async () => {
			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: command.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
						inboxUpdate: {
							...params.inboxUpdate,
							crossChainMessages: [
								codec.encode(ccmSchema, {
									crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
									fee: BigInt(0),
									module: MODULE_NAME_INTEROPERABILITY,
									nonce: BigInt(1),
									params: utils.getRandomBytes(10),
									// must be same as `context.chainID` to pass `!context.chainID.equals(ccm.receivingChainID)` check
									receivingChainID: chainID,
									// will fail for `!ccm.sendingChainID.equals(params.sendingChainID)
									// `params.sendingChainID` is defaultSendingChainID
									sendingChainID: Buffer.from([1, 2, 3, 4]),
									status: CCMStatusCode.OK,
								}),
							],
						},
					}),
				}),
			}).createCommandExecuteContext(command.schema);

			await expect(command['executeCommon'](executeContext, true)).resolves.toEqual([[], false]);
			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				expect.anything(),
				params.sendingChainID,
			);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				params.sendingChainID,
				chainID,
				{
					ccm: zeroValueCCM,
					code: CCMProcessedCode.INVALID_CCM_VALIDATION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		// next, we should check `ccm.sendingChainID.equals(ccm.receivingChainID)`
		it('should terminate the chain and add an event when receiving chain is the same as sending chain', async () => {
			const sendingChainID = Buffer.alloc(4, 1);
			executeContext = createTransactionContext({
				chainID: sendingChainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: command.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
						inboxUpdate: {
							...params.inboxUpdate,
							crossChainMessages: [
								codec.encode(ccmSchema, {
									crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
									fee: BigInt(0),
									module: MODULE_NAME_INTEROPERABILITY,
									nonce: BigInt(1),
									params: utils.getRandomBytes(10),
									// must be same as `context.chainID` to pass `!context.chainID.equals(ccm.receivingChainID)` check
									receivingChainID: sendingChainID,
									// will fail for `ccm.sendingChainID.equals(ccm.receivingChainID)`
									sendingChainID,
									status: CCMStatusCode.OK,
								}),
							],
						},
						// this is needed to pass `!ccm.sendingChainID.equals(params.sendingChainID)` check (previous test)
						sendingChainID,
					}),
				}),
			}).createCommandExecuteContext(command.schema);

			await expect(command['executeCommon'](executeContext, true)).resolves.toEqual([[], false]);
			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				expect.anything(),
				sendingChainID,
			);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				sendingChainID,
				sendingChainID,
				{
					ccm: zeroValueCCM,
					code: CCMProcessedCode.INVALID_CCM_VALIDATION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should reject with terminate the chain and add an event when ccm status is CCMStatusCode.CHANNEL_UNAVAILABLE and mainchain is true', async () => {
			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: command.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
						inboxUpdate: {
							...params.inboxUpdate,
							crossChainMessages: [
								codec.encode(ccmSchema, {
									crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
									fee: BigInt(0),
									module: MODULE_NAME_INTEROPERABILITY,
									nonce: BigInt(1),
									params: utils.getRandomBytes(10),
									// must be same as `context.chainID` to pass `!context.chainID.equals(ccm.receivingChainID)`
									receivingChainID: chainID,
									// must be same as defaultSendingChainID to pass `!ccm.sendingChainID.equals(params.sendingChainID)`
									sendingChainID: defaultSendingChainID,
									status: CCMStatusCode.CHANNEL_UNAVAILABLE,
								}),
							],
						},
					}),
				}),
			}).createCommandExecuteContext(command.schema);

			await expect(command['executeCommon'](executeContext, true)).resolves.toEqual([[], false]);
			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				expect.anything(),
				params.sendingChainID,
			);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				params.sendingChainID,
				chainID,
				{
					ccm: zeroValueCCM,
					code: CCMProcessedCode.INVALID_CCM_VALIDATION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should resolve when ccm status is CCMStatusCode.CHANNEL_UNAVAILABLE and mainchain is false', async () => {
			executeContext = createTransactionContext({
				chainID: Buffer.from([0, 0, 2, 0]),
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: command.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
						inboxUpdate: {
							...params.inboxUpdate,
							crossChainMessages: [
								codec.encode(ccmSchema, {
									crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
									fee: BigInt(0),
									module: MODULE_NAME_INTEROPERABILITY,
									nonce: BigInt(1),
									params: utils.getRandomBytes(10),
									receivingChainID: Buffer.from([0, 0, 2, 0]),
									sendingChainID: Buffer.from([0, 0, 0, 4]),
									status: CCMStatusCode.CHANNEL_UNAVAILABLE,
								}),
							],
						},
					}),
				}),
			}).createCommandExecuteContext(command.schema);

			await expect(command['executeCommon'](executeContext, false)).resolves.toEqual([
				expect.toBeArrayOfSize(1),
				true,
			]);

			expect(internalMethod.terminateChainInternal).not.toHaveBeenCalled();
			expect(command['events'].get(CcmProcessedEvent).log).not.toHaveBeenCalled();
		});

		it('should update validators when activeValidatorsUpdate is not empty', async () => {
			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: command.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
						inboxUpdate: {
							...params.inboxUpdate,
							activeValidatorsUpdate: [
								{ bftWeight: BigInt(1), blsKey: utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH) },
							],
						},
					}),
				}),
			}).createCommandExecuteContext(command.schema);

			await expect(command['executeCommon'](executeContext, true)).resolves.toEqual([
				expect.toBeArrayOfSize(params.inboxUpdate.crossChainMessages.length),
				true,
			]);
			expect(internalMethod.updateValidators).toHaveBeenCalledTimes(1);
		});

		it('should update validators when certificate threshold is different', async () => {
			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: command.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
						inboxUpdate: {
							...params.inboxUpdate,
							certificateThreshold: BigInt(1),
						},
					}),
				}),
			}).createCommandExecuteContext(command.schema);

			await expect(command['executeCommon'](executeContext, true)).resolves.toEqual([
				expect.toBeArrayOfSize(params.inboxUpdate.crossChainMessages.length),
				true,
			]);
			expect(internalMethod.updateValidators).toHaveBeenCalledTimes(1);
		});

		it('should update certificate when certificate is not empty', async () => {
			await expect(command['executeCommon'](executeContext, true)).resolves.toEqual([
				expect.toBeArrayOfSize(params.inboxUpdate.crossChainMessages.length),
				true,
			]);
			expect(internalMethod.updateCertificate).toHaveBeenCalledTimes(1);
		});

		it('should not update certificate when certificate is empty', async () => {
			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: command.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
						certificate: Buffer.alloc(0),
					}),
				}),
			}).createCommandExecuteContext(command.schema);

			await expect(command['executeCommon'](executeContext, true)).resolves.toEqual([
				expect.toBeArrayOfSize(params.inboxUpdate.crossChainMessages.length),
				true,
			]);
			expect(internalMethod.updateCertificate).not.toHaveBeenCalled();
		});
	});

	describe('apply', () => {
		it('should terminate the chain and log event when sending chain is not live', async () => {
			(internalMethod.isLive as jest.Mock).mockResolvedValue(false);

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
			);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccm: context.ccm,
					code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should terminate the chain and log event when verifyCrossChainMessage fails', async () => {
			(
				(ccMethods.get('token') as BaseCCMethod).verifyCrossChainMessage as jest.Mock
			).mockRejectedValue('error');
			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
			);
			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccm: context.ccm,
					code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should bounce if the module is not registered', async () => {
			jest.spyOn(command, 'bounce' as never).mockResolvedValue(undefined as never);
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					module: 'nonExisting',
				},
			});

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(command['bounce']).toHaveBeenCalledTimes(1);
		});

		it('should bounce if the command is not registered', async () => {
			jest.spyOn(command, 'bounce' as never).mockResolvedValue(undefined as never);
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					crossChainCommand: 'nonExisting',
				},
			});

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(command['bounce']).toHaveBeenCalledTimes(1);
		});

		it('should terminate the chain and log event when command verify fails', async () => {
			(
				(
					(ccCommands.get(defaultCCM.module) as BaseCCCommand[]).find(
						com => com.name === defaultCCM.crossChainCommand,
					) as BaseCCCommand
				).verify as jest.Mock
			).mockRejectedValue('error');

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
			);
			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccm: context.ccm,
					code: CCMProcessedCode.INVALID_CCM_VALIDATION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should terminate the chain and log event when command beforeCrossChainCommandExecute fails', async () => {
			(
				(ccMethods.get('token') as BaseCCMethod).beforeCrossChainCommandExecute as jest.Mock
			).mockRejectedValue('error');

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
			);
			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccm: context.ccm,
					code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_EXECUTION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should revert to the original state/event when command beforeCrossChainCommandExecute fails', async () => {
			(
				(ccMethods.get('token') as BaseCCMethod).beforeCrossChainCommandExecute as jest.Mock
			).mockRejectedValue('error');
			jest.spyOn(context.eventQueue, 'createSnapshot').mockReturnValue(99);
			jest.spyOn(context.stateStore, 'createSnapshot').mockReturnValue(10);
			jest.spyOn(context.eventQueue, 'restoreSnapshot');
			jest.spyOn(context.stateStore, 'restoreSnapshot');

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(99);
			expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(10);
		});

		it('should bounce, log event and restore the state/event before calling execute when execute fails', async () => {
			(
				(
					(ccCommands.get(defaultCCM.module) as BaseCCCommand[]).find(
						com => com.name === defaultCCM.crossChainCommand,
					) as BaseCCCommand
				).execute as jest.Mock
			).mockRejectedValue('error');
			jest.spyOn(command, 'bounce' as never).mockResolvedValue(undefined as never);
			let eventQueueCount = 0;
			let stateStoreCount = 0;
			jest.spyOn(context.eventQueue, 'createSnapshot').mockImplementation(() => {
				eventQueueCount += 1;
				return eventQueueCount;
			});
			jest.spyOn(context.stateStore, 'createSnapshot').mockImplementation(() => {
				stateStoreCount += 1;
				return stateStoreCount;
			});
			jest.spyOn(context.eventQueue, 'restoreSnapshot');
			jest.spyOn(context.stateStore, 'restoreSnapshot');

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(2);
			expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(2);
			expect(
				(ccMethods.get('token') as BaseCCMethod).afterCrossChainCommandExecute as jest.Mock,
			).toHaveBeenCalledTimes(1);
			expect(command['bounce']).toHaveBeenCalledTimes(1);
		});

		it('should terminate the chain and log event when command afterCrossChainCommandExecute fails', async () => {
			(
				(ccMethods.get('token') as BaseCCMethod).afterCrossChainCommandExecute as jest.Mock
			).mockRejectedValue('error');

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
			);
			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccm: context.ccm,
					code: CCMProcessedCode.INVALID_CCM_AFTER_CCC_EXECUTION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should restore the original state/event when command afterCrossChainCommandExecute fails', async () => {
			(
				(ccMethods.get('token') as BaseCCMethod).afterCrossChainCommandExecute as jest.Mock
			).mockRejectedValue('error');
			jest.spyOn(context.eventQueue, 'createSnapshot').mockReturnValue(99);
			jest.spyOn(context.stateStore, 'createSnapshot').mockReturnValue(10);
			jest.spyOn(context.eventQueue, 'restoreSnapshot');
			jest.spyOn(context.stateStore, 'restoreSnapshot');

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(99);
			expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(10);
		});

		it('call all the hooks if defined', async () => {
			const ccMethod = ccMethods.get('token');
			const ccCommand = ccCommands
				.get(defaultCCM.module)
				?.find(com => com.name === defaultCCM.crossChainCommand);

			await expect(command['apply'](context)).resolves.toBeUndefined();

			expect(ccMethod?.verifyCrossChainMessage).toHaveBeenCalledTimes(1);
			expect(ccMethod?.beforeCrossChainCommandExecute).toHaveBeenCalledTimes(1);
			expect(ccMethod?.afterCrossChainCommandExecute).toHaveBeenCalledTimes(1);
			expect(ccCommand?.verify).toHaveBeenCalledTimes(1);
			expect(ccCommand?.execute).toHaveBeenCalledTimes(1);
		});
	});

	describe('bounce', () => {
		const ccmStatus = CCMStatusCode.MODULE_NOT_SUPPORTED;
		const ccmProcessedEventCode = CCMProcessedCode.MODULE_NOT_SUPPORTED;
		it('should log event when status is not ok', async () => {
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					status: CCMStatusCode.MODULE_NOT_SUPPORTED,
				},
			});

			await expect(
				command['bounce'](context, 100, ccmStatus, ccmProcessedEventCode),
			).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccm: context.ccm,
					code: ccmProcessedEventCode,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should log event when ccm.fee is less than min fee', async () => {
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					status: CCMStatusCode.OK,
					fee: BigInt(1),
				},
			});

			await expect(
				command['bounce'](context, 100, ccmStatus, ccmProcessedEventCode),
			).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccm: context.ccm,
					code: ccmProcessedEventCode,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should add returning ccm to the sending chain if sending chain account exists', async () => {
			const chainAccountStore = command['stores'].get(ChainAccountStore);
			jest.spyOn(chainAccountStore, 'has').mockResolvedValue(true);

			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					status: CCMStatusCode.OK,
					fee: BigInt(100000000000),
				},
			});

			await expect(
				command['bounce'](context, 100, ccmStatus, ccmProcessedEventCode),
			).resolves.toBeUndefined();

			expect(internalMethod.addToOutbox).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				{
					...defaultCCM,
					status: ccmStatus,
					sendingChainID: defaultCCM.receivingChainID,
					receivingChainID: defaultCCM.sendingChainID,
					fee: context.ccm.fee - BigInt(100) * MIN_RETURN_FEE,
				},
			);
		});

		it('should add returning ccm to the mainchain outbox when sending chain does not exist', async () => {
			const chainAccountStore = command['stores'].get(ChainAccountStore);
			jest.spyOn(chainAccountStore, 'has').mockResolvedValue(false);

			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					status: CCMStatusCode.OK,
					fee: BigInt(100000000000),
				},
			});

			await expect(
				command['bounce'](context, 100, ccmStatus, ccmProcessedEventCode),
			).resolves.toBeUndefined();

			expect(internalMethod.addToOutbox).toHaveBeenCalledWith(
				expect.anything(),
				getMainchainID(context.ccm.sendingChainID),
				{
					...defaultCCM,
					status: ccmStatus,
					sendingChainID: defaultCCM.receivingChainID,
					receivingChainID: defaultCCM.sendingChainID,
					fee: context.ccm.fee - BigInt(100) * MIN_RETURN_FEE,
				},
			);
		});

		it('should log the event with the new boucing ccm', async () => {
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					status: CCMStatusCode.OK,
					fee: BigInt(100000000000),
				},
			});

			await expect(
				command['bounce'](context, 100, ccmStatus, ccmProcessedEventCode),
			).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(2);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccm: context.ccm,
					code: ccmProcessedEventCode,
					result: CCMProcessedResult.BOUNCED,
				},
			);
			expect(command['events'].get(CcmSendSuccessEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				expect.any(Buffer),
				{
					ccm: {
						...defaultCCM,
						status: ccmStatus,
						sendingChainID: defaultCCM.receivingChainID,
						receivingChainID: defaultCCM.sendingChainID,
						fee: context.ccm.fee - BigInt(100) * MIN_RETURN_FEE,
					},
				},
			);
		});
	});
});
