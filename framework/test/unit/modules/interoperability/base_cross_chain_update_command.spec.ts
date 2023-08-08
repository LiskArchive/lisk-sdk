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
import { EMPTY_BUFFER } from '@liskhq/lisk-chain/dist-node/constants';
import {
	CommandExecuteContext,
	MainchainInteroperabilityModule,
	Transaction,
} from '../../../../src';
import { BaseCCCommand } from '../../../../src/modules/interoperability/base_cc_command';
import { BaseCrossChainUpdateCommand } from '../../../../src/modules/interoperability/base_cross_chain_update_command';
import { BaseCCMethod } from '../../../../src/modules/interoperability/base_cc_method';
import {
	CCMStatusCode,
	CROSS_CHAIN_COMMAND_REGISTRATION,
	CROSS_CHAIN_COMMAND_SIDECHAIN_TERMINATED,
	HASH_LENGTH,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
	MODULE_NAME_INTEROPERABILITY,
	EMPTY_BYTES,
	EmptyCCM,
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
import { OwnChainAccountStore } from '../../../../src/modules/interoperability/stores/own_chain_account';

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

	const certificate = codec.encode(certificateSchema, {
		blockID: utils.getRandomBytes(32),
		height: 21,
		timestamp: Math.floor(Date.now() / 1000),
		stateRoot: utils.getRandomBytes(HASH_LENGTH),
		validatorsHash: utils.getRandomBytes(48),
		aggregationBits: utils.getRandomBytes(38),
		signature: utils.getRandomBytes(32),
	});

	const activeValidators = [
		{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(1) },
		{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(3) },
		{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(4) },
		{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(2) },
	].sort((v1, v2) => v1.blsKey.compare(v2.blsKey));
	const defaultSendingChainID = Buffer.from([0, 0, 2, 0]);
	const params = {
		activeValidatorsUpdate: {
			blsKeysUpdate: [
				utils.getRandomBytes(48),
				utils.getRandomBytes(48),
				utils.getRandomBytes(48),
				utils.getRandomBytes(48),
			].sort((v1, v2) => v1.compare(v2)),
			bftWeightsUpdate: [BigInt(1), BigInt(3), BigInt(4), BigInt(3)],
			bftWeightsUpdateBitmap: Buffer.from([1, 0, 2]),
		},
		certificate,
		inboxUpdate: {
			crossChainMessages: [
				{
					crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
					fee: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					nonce: BigInt(1),
					params: Buffer.alloc(2),
					receivingChainID: Buffer.from([0, 0, 0, 2]),
					sendingChainID: defaultSendingChainID,
					status: CCMStatusCode.OK,
				},
				{
					crossChainCommand: CROSS_CHAIN_COMMAND_SIDECHAIN_TERMINATED,
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
		minReturnFeePerByte: MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
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
			updatePartnerChainOutboxRoot: jest.fn(),
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
				getMinReturnFeePerByte: jest.fn().mockResolvedValue(BigInt(10000000)),
			} as any,
			{
				initializeUserAccount: jest.fn(),
			},
		);
		context = createCrossChainMessageContext({
			ccm: defaultCCM,
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
				activeValidators,
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

		it('should resolve empty ccm with false result when verifyPartnerChainOutboxRoot fails', async () => {
			(command['internalMethod'].verifyPartnerChainOutboxRoot as jest.Mock).mockRejectedValue(
				new Error('invalid root'),
			);
			await expect(command['executeCommon'](executeContext, true)).resolves.toEqual([[], false]);

			expect(command['_interopsMethod'].getMessageFeeTokenID).not.toHaveBeenCalled();
		});

		it('should verifyPartnerChainOutboxRoot when inboxUpdate is not empty', async () => {
			await expect(command['executeCommon'](executeContext, true)).resolves.toEqual([
				expect.toBeArrayOfSize(params.inboxUpdate.crossChainMessages.length),
				true,
			]);
			expect(command['internalMethod'].verifyPartnerChainOutboxRoot).toHaveBeenCalledWith(
				expect.anything(),
				params,
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

		it('should terminate the chain and add an event when fails with ccm decoding', async () => {
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
									crossChainCommand: '',
									fee: BigInt(0),
									module: '',
									nonce: BigInt(0),
									params: EMPTY_BYTES,
									receivingChainID: EMPTY_BYTES,
									sendingChainID: EMPTY_BYTES,
									// status: 0 INTENTIONALLY skipped to cause INVALID_CCM_DECODING_EXCEPTION exception
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
				executeContext,
				executeContext.params.sendingChainID,
				executeContext.chainID,
				{
					ccm: EmptyCCM,
					result: CCMProcessedResult.DISCARDED,
					code: CCMProcessedCode.INVALID_CCM_DECODING_EXCEPTION,
				},
			);
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
								// this will fail as per schema `module` `minLength` should be `MIN_MODULE_NAME_LENGTH`
								// same for `crossChainCommand`, i.e., `minLength: MIN_CROSS_CHAIN_COMMAND_NAME_LENGTH`
								codec.encode(ccmSchema, EmptyCCM),
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
				executeContext,
				executeContext.params.sendingChainID,
				EmptyCCM.receivingChainID,
				{
					ccm: { ...EmptyCCM, params: EMPTY_BYTES },
					result: CCMProcessedResult.DISCARDED,
					code: CCMProcessedCode.INVALID_CCM_VALIDATION_EXCEPTION,
				},
			);
		});

		it('should terminate the chain and add an event when CCM sending chain and ccu sending chain is not the same', async () => {
			const ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
				fee: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				nonce: BigInt(1),
				params: utils.getRandomBytes(10),
				// must be same as `context.chainID` to pass `!context.chainID.equals(ccm.receivingChainID)` check
				receivingChainID: chainID,
				// this will fail for `!ccm.sendingChainID.equals(params.sendingChainID)`
				// params.sendingChainID is `defaultSendingChainID` (line 158)
				sendingChainID: Buffer.from([1, 2, 3, 4]),
				status: CCMStatusCode.OK,
			};

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
							crossChainMessages: [codec.encode(ccmSchema, ccm)],
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
				executeContext,
				executeContext.params.sendingChainID,
				ccm.receivingChainID,
				{
					ccm,
					result: CCMProcessedResult.DISCARDED,
					code: CCMProcessedCode.INVALID_CCM_ROUTING_EXCEPTION,
				},
			);
		});

		// Sending and receiving chains must differ.
		it('should terminate the chain and add an event when receiving chain is the same as sending chain', async () => {
			const sendingChainID = chainID;
			const ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
				fee: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				nonce: BigInt(1),
				params: utils.getRandomBytes(10),
				// must be same as `context.chainID` to pass `!context.chainID.equals(ccm.receivingChainID)` check
				receivingChainID: chainID,
				// will fail for `Sending and receiving chains must differ`
				sendingChainID: chainID,
				status: CCMStatusCode.OK,
			};

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
							crossChainMessages: [codec.encode(ccmSchema, ccm)],
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
				executeContext,
				executeContext.params.sendingChainID,
				ccm.receivingChainID,
				{
					ccm,
					result: CCMProcessedResult.DISCARDED,
					code: CCMProcessedCode.INVALID_CCM_ROUTING_EXCEPTION,
				},
			);
		});

		it('should terminate the chain and add an event when CCM is not directed to the sidechain', async () => {
			const ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
				fee: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				nonce: BigInt(1),
				params: utils.getRandomBytes(10),
				// will fail for `!context.chainID.equals(ccm.receivingChainID)`
				receivingChainID: Buffer.from([0, 0, 3, 0]),
				sendingChainID: defaultSendingChainID,
				status: CCMStatusCode.OK,
			};

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
							crossChainMessages: [codec.encode(ccmSchema, ccm)],
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
				executeContext,
				executeContext.params.sendingChainID,
				ccm.receivingChainID,
				{
					ccm,
					result: CCMProcessedResult.DISCARDED,
					code: CCMProcessedCode.INVALID_CCM_ROUTING_EXCEPTION,
				},
			);
		});

		it('should reject with terminate the chain and add an event when ccm status is CCMStatusCode.CHANNEL_UNAVAILABLE and mainchain is true', async () => {
			const ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
				fee: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				nonce: BigInt(1),
				params: utils.getRandomBytes(10),
				// must be same as `context.chainID` to pass `!context.chainID.equals(ccm.receivingChainID)`
				receivingChainID: chainID,
				// must be same as defaultSendingChainID to pass `!ccm.sendingChainID.equals(params.sendingChainID)`
				sendingChainID: defaultSendingChainID,
				// will fail for `CCMStatusCode.CHANNEL_UNAVAILABLE`
				status: CCMStatusCode.CHANNEL_UNAVAILABLE,
			};

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
							crossChainMessages: [codec.encode(ccmSchema, ccm)],
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
				executeContext,
				executeContext.params.sendingChainID,
				ccm.receivingChainID,
				{
					ccm,
					result: CCMProcessedResult.DISCARDED,
					code: CCMProcessedCode.INVALID_CCM_ROUTING_EXCEPTION,
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
									crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
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
	});

	describe('afterExecuteCommon', () => {
		let executeContext: CommandExecuteContext<CrossChainUpdateTransactionParams>;
		let chainValidatorsStore: ChainValidatorsStore;

		beforeEach(() => {
			executeContext = createTransactionContext({
				transaction: new Transaction({
					...defaultTransaction,
					command: command.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
						inboxUpdate: {
							...params.inboxUpdate,
						},
						activeValidatorsUpdate: {
							blsKeysUpdate: [utils.getRandomBytes(48)],
							bftWeightsUpdate: [BigInt(1), BigInt(3), BigInt(4), BigInt(3)],
							bftWeightsUpdateBitmap: Buffer.from([1]),
						},
						sendingChainID: defaultSendingChainID,
						certificateThreshold: BigInt(20),
						certificate,
					}),
				}),
			}).createCommandExecuteContext(command.schema);

			chainValidatorsStore = command['stores'].get(ChainValidatorsStore);
			jest.spyOn(chainValidatorsStore, 'get').mockResolvedValue({
				certificateThreshold: BigInt(10),
			} as any);

			const channelDataStore = command['stores'].get(ChannelDataStore);
			jest.spyOn(channelDataStore, 'get').mockResolvedValue({
				inbox: {
					size: 1,
				} as any,
			} as any);
		});

		it('should update validators if activeValidatorsUpdate is not empty but params.certificateThreshold === sendingChainValidators.certificateThreshold', async () => {
			jest.spyOn(chainValidatorsStore, 'get').mockResolvedValue({
				certificateThreshold: BigInt(20),
			} as any);

			await expect(command['afterExecuteCommon'](executeContext)).resolves.toBeUndefined();
			expect(command['internalMethod'].updateValidators).toHaveBeenCalledWith(
				expect.anything(),
				executeContext.params,
			);
		});

		it('should update validators if activeValidatorsUpdate is empty but params.certificateThreshold !== sendingChainValidators.certificateThreshold', async () => {
			executeContext.params.activeValidatorsUpdate.bftWeightsUpdateBitmap = EMPTY_BUFFER;
			await expect(command['afterExecuteCommon'](executeContext)).resolves.toBeUndefined();

			expect(command['internalMethod'].updateValidators).toHaveBeenCalledWith(
				expect.anything(),
				executeContext.params,
			);
		});

		it('should not update certificate and updatePartnerChainOutboxRoot if certificate is empty', async () => {
			executeContext.params.certificate = EMPTY_BYTES;
			await expect(command['afterExecuteCommon'](executeContext)).resolves.toBeUndefined();
			expect(command['internalMethod'].updateCertificate).not.toHaveBeenCalled();
			expect(command['internalMethod'].updatePartnerChainOutboxRoot).not.toHaveBeenCalled();
		});

		it('should not update partnerChainOutboxRoot if inboxUpdate is empty', async () => {
			executeContext.params.inboxUpdate = {
				crossChainMessages: [],
				messageWitnessHashes: [],
				outboxRootWitness: {
					siblingHashes: [],
					bitmap: EMPTY_BUFFER,
				},
			};
			await expect(command['afterExecuteCommon'](executeContext)).resolves.toBeUndefined();

			expect(command['internalMethod'].updatePartnerChainOutboxRoot).not.toHaveBeenCalled();
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
					code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
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

		it('should raise exception(and hence bounce) when chainAccount(ccm.sendingChainID) exists and ccu.params.sendingChainID !== ccm.sendingChainID', async () => {
			const chainAccountStore = command['stores'].get(ChainAccountStore);
			jest.spyOn(chainAccountStore, 'has').mockResolvedValue(true);
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
		let stateStore: PrefixedStateReadWriter;

		beforeEach(async () => {
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			await interopsModule.stores.get(OwnChainAccountStore).set(stateStore, EMPTY_BYTES, {
				chainID: Buffer.from('11111111', 'hex'),
				name: 'ownChain',
				nonce: BigInt(1),
			});
		});

		it('should log event when status is not ok', async () => {
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					status: CCMStatusCode.MODULE_NOT_SUPPORTED,
				},
				stateStore,
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
				stateStore,
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
				stateStore,
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
					fee: BigInt(0),
				},
			);
		});

		it('should add returning ccm to the sending chain outbox when ownChainID is mainchainID', async () => {
			const chainAccountStore = command['stores'].get(ChainAccountStore);
			jest.spyOn(chainAccountStore, 'has').mockResolvedValue(false);

			await interopsModule.stores.get(OwnChainAccountStore).set(stateStore, EMPTY_BYTES, {
				chainID: getMainchainID(defaultCCM.receivingChainID),
				name: 'mainchain',
				nonce: BigInt(1),
			});

			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					status: CCMStatusCode.OK,
					fee: BigInt(100000000000),
				},
				stateStore,
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
					fee: BigInt(0),
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
				stateStore,
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
					fee: BigInt(0),
				},
			);
		});

		it('should log the event with the new bouncing ccm', async () => {
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					status: CCMStatusCode.OK,
					fee: BigInt(100000000000),
				},
				stateStore,
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
						fee: BigInt(0),
					},
				},
			);
		});
	});
});
