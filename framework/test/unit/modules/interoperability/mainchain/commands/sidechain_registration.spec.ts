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

import { utils } from '@liskhq/lisk-cryptography';
import { Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import * as testing from '../../../../../../src/testing';
import { SidechainRegistrationCommand } from '../../../../../../src/modules/interoperability/mainchain/commands/sidechain_registration';
import {
	CCM_STATUS_OK,
	EMPTY_FEE_ADDRESS,
	EMPTY_HASH,
	MAX_UINT64,
	MAX_LENGTH_NAME,
	MAX_NUM_VALIDATORS,
	MAINCHAIN_ID_BUFFER,
	MODULE_NAME_INTEROPERABILITY,
	COMMAND_NAME_SIDECHAIN_REG,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
} from '../../../../../../src/modules/interoperability/constants';
import {
	sidechainRegParams,
	registrationCCMParamsSchema,
} from '../../../../../../src/modules/interoperability/schemas';
import {
	SendInternalContext,
	SidechainRegistrationParams,
} from '../../../../../../src/modules/interoperability/types';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerifyStatus,
} from '../../../../../../src/state_machine';
import { computeValidatorsHash } from '../../../../../../src/modules/interoperability/utils';
import { PrefixedStateReadWriter } from '../../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../../src/testing/in_memory_prefixed_state';
import { MainchainInteroperabilityModule } from '../../../../../../src';
import { RegisteredNamesStore } from '../../../../../../src/modules/interoperability/stores/registered_names';
import { RegisteredNetworkStore } from '../../../../../../src/modules/interoperability/stores/registered_network_ids';
import { createStoreGetter } from '../../../../../../src/testing/utils';
import { ChannelDataStore } from '../../../../../../src/modules/interoperability/stores/channel_data';
import { OutboxRootStore } from '../../../../../../src/modules/interoperability/stores/outbox_root';
import {
	ChainAccount,
	ChainAccountStore,
} from '../../../../../../src/modules/interoperability/stores/chain_account';
import { ChainValidatorsStore } from '../../../../../../src/modules/interoperability/stores/chain_validators';
import { createTransactionContext } from '../../../../../../src/testing';

describe('Sidechain registration command', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const transactionParams = {
		name: 'sidechain',
		genesisBlockID: Buffer.alloc(0),
		initValidators: [
			{
				blsKey: Buffer.from(
					'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
					'hex',
				),
				bftWeight: BigInt(10),
			},
			{
				blsKey: Buffer.from(
					'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
					'hex',
				),
				bftWeight: BigInt(10),
			},
		],
		certificateThreshold: BigInt(10),
	};
	const encodedTransactionParams = codec.encode(sidechainRegParams, transactionParams);
	const publicKey = utils.getRandomBytes(32);
	const transaction = new Transaction({
		module: MODULE_NAME_INTEROPERABILITY,
		command: COMMAND_NAME_SIDECHAIN_REG,
		senderPublicKey: publicKey,
		nonce: BigInt(0),
		fee: BigInt(100000000),
		params: encodedTransactionParams,
		signatures: [publicKey],
	});
	const chainID = Buffer.from(
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
		'hex',
	);
	const networkID = utils.hash(Buffer.concat([Buffer.alloc(0), transaction.senderAddress]));
	let sidechainRegistrationCommand: SidechainRegistrationCommand;
	let stateStore: PrefixedStateReadWriter;
	let nameSubstore: RegisteredNamesStore;
	let networkIDSubstore: RegisteredNetworkStore;
	let verifyContext: CommandVerifyContext<SidechainRegistrationParams>;

	beforeEach(() => {
		sidechainRegistrationCommand = new SidechainRegistrationCommand(
			interopMod.stores,
			interopMod.events,
			new Map(),
			new Map(),
		);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		nameSubstore = interopMod.stores.get(RegisteredNamesStore);
		networkIDSubstore = interopMod.stores.get(RegisteredNetworkStore);
	});

	describe('verify', () => {
		beforeEach(() => {
			verifyContext = testing
				.createTransactionContext({
					stateStore,
					transaction,
					chainID,
				})
				.createCommandVerifyContext<SidechainRegistrationParams>(sidechainRegParams);
		});

		it('should return status OK for valid params', async () => {
			const result = await sidechainRegistrationCommand.verify(verifyContext);
			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return error if name is invalid', async () => {
			verifyContext.params.name = '*@#&$_2';
			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`Sidechain name is in an unsupported format: *@#&$_2`,
			);
		});

		it(`should return error if name is more than ${MAX_LENGTH_NAME} characters long`, async () => {
			verifyContext.params.name = new Array(MAX_LENGTH_NAME + 2).join('a');
			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`Property '.name' must NOT have more than ${MAX_LENGTH_NAME} characters`,
			);
		});

		it('should return error if store key name already exists in name store', async () => {
			await nameSubstore.set(
				createStoreGetter(stateStore),
				Buffer.from(transactionParams.name, 'utf8'),
				{ id: utils.intToBuffer(0, 4) },
			);
			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Name substore must not have an entry for the store key name',
			);
		});

		it('should return error if store key networkID already exists in networkID store', async () => {
			await networkIDSubstore.set(createStoreGetter(stateStore), networkID, {
				id: utils.intToBuffer(0, 4),
			});

			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Network ID substore must not have an entry for the store key networkID',
			);
		});

		it(`should return error if initValidators array count exceeds ${MAX_NUM_VALIDATORS}`, async () => {
			verifyContext.params.initValidators = new Array(MAX_NUM_VALIDATORS + 2).fill({
				blsKey: utils.getRandomBytes(48),
				bftWeight: BigInt(1),
			});
			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`must NOT have more than ${MAX_NUM_VALIDATORS} items`,
			);
		});

		it('should return error if initValidators array does not have any elements', async () => {
			verifyContext.params.initValidators = [];

			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('must NOT have fewer than 1 items');
		});

		it('should return error if bls key is below minimum length', async () => {
			verifyContext.params.initValidators = [
				{
					blsKey: utils.getRandomBytes(2),
					bftWeight: BigInt(10),
				},
			];

			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				"Property '.initValidators.0.blsKey' minLength not satisfied",
			);
		});

		it('should return error if bls key is above maximum length', async () => {
			verifyContext.params.initValidators = [
				{
					blsKey: utils.getRandomBytes(50),
					bftWeight: BigInt(10),
				},
			];

			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				"Property '.initValidators.0.blsKey' maxLength exceeded",
			);
		});

		it('should return error if bls keys are not lexicographically ordered', async () => {
			verifyContext.params.initValidators = [
				{
					blsKey: Buffer.from(
						'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
						'hex',
					),
					bftWeight: BigInt(10),
				},
				{
					blsKey: Buffer.from(
						'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
						'hex',
					),
					bftWeight: BigInt(10),
				},
			];

			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Validators blsKeys must be unique and lexicographically ordered',
			);
		});

		it('should return error if duplicate bls keys', async () => {
			verifyContext.params.initValidators = [
				{
					blsKey: Buffer.from(
						'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
						'hex',
					),
					bftWeight: BigInt(10),
				},
				{
					blsKey: Buffer.from(
						'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
						'hex',
					),
					bftWeight: BigInt(10),
				},
			];

			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Validators blsKeys must be unique and lexicographically ordered',
			);
		});

		it('should return error if invalid bft weight', async () => {
			verifyContext.params.initValidators = [
				{
					blsKey: Buffer.from(
						'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
						'hex',
					),
					bftWeight: BigInt(0),
				},
				{
					blsKey: Buffer.from(
						'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
						'hex',
					),
					bftWeight: BigInt(0),
				},
			];

			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Validator bft weight must be greater than 0');
		});

		it(`should return error if totalBftWeight exceeds ${MAX_UINT64}`, async () => {
			verifyContext.params.initValidators = [
				{
					blsKey: Buffer.from(
						'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
						'hex',
					),
					bftWeight: MAX_UINT64,
				},
				{
					blsKey: Buffer.from(
						'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
						'hex',
					),
					bftWeight: BigInt(10),
				},
			];

			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Validator bft weight must not exceed ${MAX_UINT64}`);
		});

		it('should return error if certificate theshold below minimum weight', async () => {
			verifyContext.params.certificateThreshold = BigInt(1);

			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Certificate threshold below minimum bft weight');
		});

		it('should return error if certificate theshold exceeds maximum weight', async () => {
			verifyContext.params.certificateThreshold = BigInt(1000);

			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Certificate threshold above maximum bft weight');
		});
	});

	describe('execute', () => {
		const genesisBlockID = Buffer.alloc(0);
		const newChainID = utils.intToBuffer(2, 4);
		const existingChainID = Buffer.alloc(4);
		existingChainID.writeUInt32BE(1, 0);
		const params = {
			name: 'sidechain',
			genesisBlockID,
			initValidators: [
				{
					blsKey: Buffer.from(
						'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
						'hex',
					),
					bftWeight: BigInt(10),
				},
				{
					blsKey: Buffer.from(
						'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
						'hex',
					),
					bftWeight: BigInt(10),
				},
			],
			certificateThreshold: BigInt(10),
		};
		const chainAccount: ChainAccount = {
			name: 'sidechain',
			networkID,
			lastCertificate: {
				height: 0,
				timestamp: 0,
				stateRoot: EMPTY_HASH,
				validatorsHash: computeValidatorsHash(params.initValidators, params.certificateThreshold),
			},
			status: 0,
		};
		let context: CommandExecuteContext<SidechainRegistrationParams>;

		let channelDataSubstore: ChannelDataStore;
		let outboxRootSubstore: OutboxRootStore;
		let chainDataSubstore: ChainAccountStore;
		let chainValidatorsSubstore: ChainValidatorsStore;
		let registeredNamesSubstore: RegisteredNamesStore;
		let registeredNetworkIDsSubstore: RegisteredNetworkStore;

		const sendInternal = jest.fn();

		beforeEach(async () => {
			sidechainRegistrationCommand['getInteroperabilityStore'] = jest
				.fn()
				.mockReturnValue({ sendInternal });
			channelDataSubstore = interopMod.stores.get(ChannelDataStore);
			chainValidatorsSubstore = interopMod.stores.get(ChainValidatorsStore);
			outboxRootSubstore = interopMod.stores.get(OutboxRootStore);
			chainDataSubstore = interopMod.stores.get(ChainAccountStore);
			registeredNamesSubstore = interopMod.stores.get(RegisteredNamesStore);
			registeredNetworkIDsSubstore = interopMod.stores.get(RegisteredNetworkStore);

			context = createTransactionContext({
				transaction,
			}).createCommandExecuteContext(sidechainRegParams);
			await chainDataSubstore.set(context, existingChainID, chainAccount);

			jest.spyOn(chainDataSubstore, 'set');
			jest.spyOn(channelDataSubstore, 'set');
			jest.spyOn(chainValidatorsSubstore, 'set');
			jest.spyOn(outboxRootSubstore, 'set');
			jest.spyOn(registeredNetworkIDsSubstore, 'set');
			jest.spyOn(registeredNamesSubstore, 'set');
		});

		it('should add an entry to chain account substore', async () => {
			// Arrange
			const expectedValue = {
				name: 'sidechain',
				networkID,
				lastCertificate: {
					height: 0,
					timestamp: 0,
					stateRoot: EMPTY_HASH,
					validatorsHash: computeValidatorsHash(params.initValidators, params.certificateThreshold),
				},
				status: CCM_STATUS_OK,
			};

			// Act
			await sidechainRegistrationCommand.execute(context);

			// Assert
			expect(chainDataSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				newChainID,
				expectedValue,
			);
		});

		it('should throw error if no entries found in chain account substore', async () => {
			// Arrange
			await chainDataSubstore.del(context, existingChainID);

			// Act
			// Assert
			await expect(sidechainRegistrationCommand.execute(context)).rejects.toThrow(
				'No existing entries found in chain store',
			);
		});

		it('should add an entry to channel account substore', async () => {
			// Arrange
			const expectedValue = {
				inbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				outbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				partnerChainOutboxRoot: EMPTY_HASH,
				messageFeeTokenID: { chainID: utils.intToBuffer(1, 4), localID: utils.intToBuffer(0, 4) },
			};

			// Act
			await sidechainRegistrationCommand.execute(context);

			// Assert
			expect(channelDataSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				newChainID,
				expectedValue,
			);
		});

		it('should call sendInternal with a registration ccm', async () => {
			// Arrange
			const receivingChainID = utils.intToBuffer(2, 4);
			const encodedParams = codec.encode(registrationCCMParamsSchema, {
				networkID,
				name: chainAccount.name,
				messageFeeTokenID: { chainID: MAINCHAIN_ID_BUFFER, localID: utils.intToBuffer(0, 4) },
			});

			// Act
			await sidechainRegistrationCommand.execute(context);

			// Assert
			expect(sendInternal).toHaveBeenCalledWith({
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
				receivingChainID,
				fee: BigInt(0),
				status: CCM_STATUS_OK,
				params: encodedParams,
				timestamp: expect.any(Number),
				eventQueue: context.eventQueue,
				feeAddress: EMPTY_FEE_ADDRESS,
				getMethodContext: context.getMethodContext,
				getStore: context.getStore,
				logger: context.logger,
				chainID: context.chainID,
			} as SendInternalContext);
		});

		it('should add an entry to chain validators substore', async () => {
			// Arrange
			const expectedValue = {
				activeValidators: params.initValidators,
				certificateThreshold: params.certificateThreshold,
			};

			// Act
			await sidechainRegistrationCommand.execute(context);
			expect(chainValidatorsSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				newChainID,
				expectedValue,
			);
		});

		it('should add an entry to outbox root substore', async () => {
			// Arrange
			const expectedValue = { root: EMPTY_HASH };

			// Act
			await sidechainRegistrationCommand.execute(context);

			// Assert
			expect(outboxRootSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				newChainID,
				expectedValue,
			);
		});

		it('should add an entry to registered names substore', async () => {
			// Arrange
			const expectedValue = { id: newChainID };

			// Act
			await sidechainRegistrationCommand.execute(context);

			// Assert
			expect(registeredNamesSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				Buffer.from(params.name, 'utf-8'),
				expectedValue,
			);
		});

		it('should add an entry to registered network IDs substore', async () => {
			// Arrange
			const expectedValue = { id: newChainID };

			// Act
			await sidechainRegistrationCommand.execute(context);

			// Assert
			expect(registeredNetworkIDsSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				networkID,
				expectedValue,
			);
		});
	});
});
