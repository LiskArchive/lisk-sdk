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
import { validator } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import * as testing from '../../../../../../src/testing';
import { createTransactionContext } from '../../../../../../src/testing';
import { RegisterSidechainCommand } from '../../../../../../src/modules/interoperability/mainchain/commands/register_sidechain';
import {
	EMPTY_HASH,
	MAX_UINT64,
	MAX_NUM_VALIDATORS,
	MODULE_NAME_INTEROPERABILITY,
	COMMAND_NAME_SIDECHAIN_REG,
	CHAIN_REGISTRATION_FEE,
	MAX_CHAIN_NAME_LENGTH,
	EVENT_NAME_CHAIN_ACCOUNT_UPDATED,
	CROSS_CHAIN_COMMAND_REGISTRATION,
	EVENT_NAME_CCM_SEND_SUCCESS,
	CCMStatusCode,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
} from '../../../../../../src/modules/interoperability/constants';
import {
	registrationCCMParamsSchema,
	sidechainRegParams,
} from '../../../../../../src/modules/interoperability/schemas';
import { SidechainRegistrationParams } from '../../../../../../src/modules/interoperability/types';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerifyStatus,
} from '../../../../../../src/state_machine';
import {
	computeValidatorsHash,
	getMainchainID,
	getTokenIDLSK,
	getEncodedCCMAndID,
} from '../../../../../../src/modules/interoperability/utils';
import { PrefixedStateReadWriter } from '../../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../../src/testing/in_memory_prefixed_state';
import { MainchainInteroperabilityModule, TokenMethod, MethodContext } from '../../../../../../src';
import { RegisteredNamesStore } from '../../../../../../src/modules/interoperability/stores/registered_names';
import { createStoreGetter } from '../../../../../../src/testing/utils';
import { ChannelDataStore } from '../../../../../../src/modules/interoperability/stores/channel_data';
import { OutboxRootStore } from '../../../../../../src/modules/interoperability/stores/outbox_root';
import {
	ChainAccount,
	ChainAccountStore,
	ChainStatus,
} from '../../../../../../src/modules/interoperability/stores/chain_account';
import { ChainValidatorsStore } from '../../../../../../src/modules/interoperability/stores/chain_validators';
import { OwnChainAccountStore } from '../../../../../../src/modules/interoperability/stores/own_chain_account';
import { EMPTY_BYTES } from '../../../../../../src/modules/token/constants';
import { ChainAccountUpdatedEvent } from '../../../../../../src/modules/interoperability/events/chain_account_updated';
import { CcmSendSuccessEvent } from '../../../../../../src/modules/interoperability/events/ccm_send_success';
import { InvalidNameError } from '../../../../../../src/modules/interoperability/errors';

describe('RegisterSidechainCommand', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const chainID = Buffer.from([0, 0, 0, 0]);
	const newChainID = utils.intToBuffer(2, 4);
	const existingChainID = utils.intToBuffer(1, 4);
	const transactionParams = {
		name: 'sidechain',
		chainID: newChainID,
		sidechainValidators: [
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
		sidechainCertificateThreshold: BigInt(10),
		sidechainRegistrationFee: CHAIN_REGISTRATION_FEE,
	};
	const encodedTransactionParams = codec.encode(sidechainRegParams, transactionParams);
	const publicKey = utils.getRandomBytes(32);
	const transaction = new Transaction({
		module: MODULE_NAME_INTEROPERABILITY,
		command: COMMAND_NAME_SIDECHAIN_REG,
		senderPublicKey: publicKey,
		nonce: BigInt(0),
		fee: BigInt(10000000000),
		params: encodedTransactionParams,
		signatures: [publicKey],
	});
	const chainAccount: ChainAccount = {
		name: 'sidechain',
		lastCertificate: {
			height: 0,
			timestamp: 0,
			stateRoot: EMPTY_HASH,
			validatorsHash: computeValidatorsHash(
				transactionParams.sidechainValidators,
				transactionParams.sidechainCertificateThreshold,
			),
		},
		status: 0,
	};

	let sidechainRegistrationCommand: RegisterSidechainCommand;
	let stateStore: PrefixedStateReadWriter;
	let nameSubstore: RegisteredNamesStore;
	let chainAccountSubstore: ChainAccountStore;
	let ownChainAccountSubstore: OwnChainAccountStore;
	let channelDataSubstore: ChannelDataStore;
	let outboxRootSubstore: OutboxRootStore;
	let chainValidatorsSubstore: ChainValidatorsStore;
	let registeredNamesSubstore: RegisteredNamesStore;
	let verifyContext: CommandVerifyContext<SidechainRegistrationParams>;
	const tokenMethod: TokenMethod = new TokenMethod(
		interopMod.stores,
		interopMod.events,
		interopMod.name,
	);
	let initializeEscrowAmountMock: jest.SpyInstance<
		Promise<void>,
		[methodContext: MethodContext, chainID: Buffer, tokenID: Buffer]
	>;

	beforeEach(async () => {
		sidechainRegistrationCommand = new RegisterSidechainCommand(
			interopMod.stores,
			interopMod.events,
			new Map(),
			new Map(),
			interopMod['internalMethod'],
		);

		initializeEscrowAmountMock = jest
			.spyOn(tokenMethod, 'initializeEscrowAccount')
			.mockResolvedValue();

		// Set up dependencies
		sidechainRegistrationCommand.addDependencies({ payFee: jest.fn() }, tokenMethod);

		// Initialize stores
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		nameSubstore = interopMod.stores.get(RegisteredNamesStore);
		chainAccountSubstore = interopMod.stores.get(ChainAccountStore);
		channelDataSubstore = interopMod.stores.get(ChannelDataStore);
		chainValidatorsSubstore = interopMod.stores.get(ChainValidatorsStore);
		outboxRootSubstore = interopMod.stores.get(OutboxRootStore);
		chainAccountSubstore = interopMod.stores.get(ChainAccountStore);
		registeredNamesSubstore = interopMod.stores.get(RegisteredNamesStore);
		ownChainAccountSubstore = interopMod.stores.get(OwnChainAccountStore);
		await ownChainAccountSubstore.set(createStoreGetter(stateStore), EMPTY_BYTES, {
			name: 'lisk',
			chainID,
			nonce: BigInt(0),
		});
		await chainAccountSubstore.set(createStoreGetter(stateStore), existingChainID, chainAccount);

		// Set up spies
		jest.spyOn(channelDataSubstore, 'set');
		jest.spyOn(chainValidatorsSubstore, 'set');
		jest.spyOn(outboxRootSubstore, 'set');
		jest.spyOn(registeredNamesSubstore, 'set');
		jest.spyOn(chainAccountSubstore, 'set');
		jest.spyOn(ownChainAccountSubstore, 'set');
	});

	describe('verify schema', () => {
		it(`should return error if sidechainValidators array count exceeds ${MAX_NUM_VALIDATORS}`, () => {
			expect(() =>
				validator.validate(sidechainRegistrationCommand.schema, {
					...transactionParams,
					sidechainValidators: new Array(MAX_NUM_VALIDATORS + 2).fill({
						blsKey: utils.getRandomBytes(48),
						bftWeight: BigInt(1),
					}),
				}),
			).toThrow(`must NOT have more than ${MAX_NUM_VALIDATORS} items`);
		});

		it('should return error if sidechainValidators array does not have any elements', () => {
			expect(() =>
				validator.validate(sidechainRegistrationCommand.schema, {
					...transactionParams,
					sidechainValidators: [],
				}),
			).toThrow('must NOT have fewer than 1 items');
		});

		it('should return error if bls key is below minimum length', () => {
			expect(() =>
				validator.validate(sidechainRegistrationCommand.schema, {
					...transactionParams,
					sidechainValidators: [
						{
							blsKey: utils.getRandomBytes(2),
							bftWeight: BigInt(10),
						},
					],
				}),
			).toThrow("Property '.sidechainValidators.0.blsKey' minLength not satisfied");
		});

		it('should return error if bls key is above maximum length', () => {
			expect(() =>
				validator.validate(sidechainRegistrationCommand.schema, {
					...transactionParams,
					sidechainValidators: [
						{
							blsKey: utils.getRandomBytes(50),
							bftWeight: BigInt(10),
						},
					],
				}),
			).toThrow("Property '.sidechainValidators.0.blsKey' maxLength exceeded");
		});

		it(`should return error if name is more than ${MAX_CHAIN_NAME_LENGTH} characters long`, () => {
			expect(() =>
				validator.validate(sidechainRegistrationCommand.schema, {
					...transactionParams,
					name: new Array(MAX_CHAIN_NAME_LENGTH + 2).join('a'),
				}),
			).toThrow(`Property '.name' must NOT have more than ${MAX_CHAIN_NAME_LENGTH} characters`);
		});
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
			expect(result.error?.message).toInclude(new InvalidNameError().message);
		});

		it('should return error if store key name already exists in name store', async () => {
			await nameSubstore.set(
				createStoreGetter(stateStore),
				Buffer.from(transactionParams.name, 'ascii'),
				{ chainID: utils.intToBuffer(0, 4) },
			);
			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Name already registered.');
		});

		it('should return error if store key chainID already exists in chainID store', async () => {
			await chainAccountSubstore.set(createStoreGetter(stateStore), newChainID, {
				name: 'chain',
				lastCertificate: {
					height: 1,
					timestamp: 1,
					stateRoot: Buffer.alloc(0),
					validatorsHash: Buffer.alloc(0),
				},
				status: 1,
			});

			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Chain ID already registered.');
		});

		it('should return error if first byte of chainID does not match', async () => {
			verifyContext.params.chainID = Buffer.from([0x11, 0x01, 0x02, 0x01]);
			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Chain ID does not match the mainchain network.');
		});

		it('should return error if chainID equals the mainchain chain ID', async () => {
			verifyContext.params.chainID = getMainchainID(chainID);
			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Chain ID cannot be the mainchain chain ID.');
		});

		it('should return error if bls keys are not lexicographically ordered', async () => {
			verifyContext.params.sidechainValidators = [
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
			verifyContext.params.sidechainValidators = [
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
			verifyContext.params.sidechainValidators = [
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
			verifyContext.params.sidechainValidators = [
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
			verifyContext.params.sidechainCertificateThreshold = BigInt(1);

			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Certificate threshold below minimum bft weight');
		});

		it('should return error if certificate theshold exceeds maximum weight', async () => {
			verifyContext.params.sidechainCertificateThreshold = BigInt(1000);

			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Certificate threshold above maximum bft weight');
		});

		it(`should return error if transaction fee is less than ${CHAIN_REGISTRATION_FEE}`, async () => {
			verifyContext.transaction = new Transaction({
				...verifyContext.transaction,
				fee: BigInt(900000000),
			});
			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Insufficient transaction fee.');
		});
	});

	describe('execute', () => {
		let context: CommandExecuteContext<SidechainRegistrationParams>;
		let chainAccountUpdatedEvent: ChainAccountUpdatedEvent;
		let ccmSendSuccessEvent: CcmSendSuccessEvent;

		beforeEach(() => {
			chainAccountUpdatedEvent = interopMod.events.get(ChainAccountUpdatedEvent);
			ccmSendSuccessEvent = interopMod.events.get(CcmSendSuccessEvent);
			jest.spyOn(chainAccountUpdatedEvent, 'log');
			jest.spyOn(ccmSendSuccessEvent, 'log');
			context = createTransactionContext({
				transaction,
				stateStore,
				chainID,
			}).createCommandExecuteContext(sidechainRegParams);
		});

		it('should add an entry to chain account substore', async () => {
			// Arrange
			const expectedValue = {
				name: 'sidechain',
				lastCertificate: {
					height: 0,
					timestamp: 0,
					stateRoot: EMPTY_HASH,
					validatorsHash: computeValidatorsHash(
						transactionParams.sidechainValidators,
						transactionParams.sidechainCertificateThreshold,
					),
				},
				status: CCMStatusCode.OK,
			};

			// Act
			await sidechainRegistrationCommand.execute(context);

			// Assert
			expect(chainAccountSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				newChainID,
				expectedValue,
			);
		});

		it('should add an entry to channel account substore', async () => {
			// Arrange
			const expectedValue = {
				inbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				outbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				partnerChainOutboxRoot: EMPTY_HASH,
				messageFeeTokenID: getTokenIDLSK(chainID),
				minReturnFeePerByte: MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
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

		it('should add an entry to chain validators substore', async () => {
			// Arrange
			const expectedValue = {
				activeValidators: transactionParams.sidechainValidators,
				certificateThreshold: transactionParams.sidechainCertificateThreshold,
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
			const expectedValue = { chainID: newChainID };

			// Act
			await sidechainRegistrationCommand.execute(context);

			// Assert
			expect(registeredNamesSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				Buffer.from(transactionParams.name, 'ascii'),
				expectedValue,
			);
		});

		it(`should emit ${EVENT_NAME_CHAIN_ACCOUNT_UPDATED} event`, async () => {
			const sidechainAccount = {
				name: 'sidechain',
				lastCertificate: {
					height: 0,
					timestamp: 0,
					stateRoot: EMPTY_HASH,
					validatorsHash: computeValidatorsHash(
						transactionParams.sidechainValidators,
						transactionParams.sidechainCertificateThreshold,
					),
				},
				status: ChainStatus.REGISTERED,
			};

			// Act
			await sidechainRegistrationCommand.execute(context);

			// Assert
			expect(chainAccountUpdatedEvent.log).toHaveBeenCalledWith(
				expect.anything(),
				newChainID,
				sidechainAccount,
			);
		});

		it('should pay fee', async () => {
			// Act
			await sidechainRegistrationCommand.execute(context);

			// Assert
			expect(sidechainRegistrationCommand['_feeMethod'].payFee).toHaveBeenCalledWith(
				expect.anything(),
				CHAIN_REGISTRATION_FEE,
			);
		});

		it('should initialize escrow account', async () => {
			// Act
			await sidechainRegistrationCommand.execute(context);

			// Assert
			expect(initializeEscrowAmountMock).toHaveBeenCalledWith(
				expect.anything(),
				context.params.chainID,
				getTokenIDLSK(context.params.chainID),
			);
		});

		it('should update nonce in own chain acount substore', async () => {
			// Arrange
			const expectedValue = { name: 'lisk', chainID, nonce: BigInt(1) };

			// Act
			await sidechainRegistrationCommand.execute(context);

			// Assert
			expect(ownChainAccountSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				EMPTY_BYTES,
				expectedValue,
			);
		});

		it(`should emit ${EVENT_NAME_CCM_SEND_SUCCESS} event`, async () => {
			const encodedParams = codec.encode(registrationCCMParamsSchema, {
				name: transactionParams.name,
				chainID: newChainID,
				messageFeeTokenID: getTokenIDLSK(chainID),
				minReturnFeePerByte: MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
			});
			const ccm = {
				nonce: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
				sendingChainID: chainID,
				receivingChainID: newChainID,
				fee: BigInt(0),
				status: CCMStatusCode.OK,
				params: encodedParams,
			};

			const { ccmID } = getEncodedCCMAndID(ccm);
			// Act
			await sidechainRegistrationCommand.execute(context);

			// Assert
			expect(ccmSendSuccessEvent.log).toHaveBeenCalledWith(
				expect.anything(),
				chainID,
				newChainID,
				ccmID,
				{
					ccm,
				},
			);
		});
	});
});
