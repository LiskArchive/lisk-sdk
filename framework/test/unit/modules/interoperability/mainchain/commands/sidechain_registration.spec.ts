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
	EMPTY_HASH,
	MAX_UINT64,
	MAX_NUM_VALIDATORS,
	MAINCHAIN_ID_BUFFER,
	MODULE_NAME_INTEROPERABILITY,
	COMMAND_NAME_SIDECHAIN_REG,
	REGISTRATION_FEE,
	MAX_CHAIN_NAME_LENGTH,
	EVENT_NAME_CHAIN_ACCOUNT_UPDATED,
	CROSS_CHAIN_COMMAND_REGISTRATION,
	EVENT_NAME_CCM_SEND_SUCCESS,
	CCMStatusCode,
} from '../../../../../../src/modules/interoperability/constants';
import {
	ccmSchema,
	registrationCCMParamsSchema,
	sidechainRegParams,
} from '../../../../../../src/modules/interoperability/schemas';
import { SidechainRegistrationParams } from '../../../../../../src/modules/interoperability/types';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerifyStatus,
} from '../../../../../../src/state_machine';
import { computeValidatorsHash } from '../../../../../../src/modules/interoperability/utils';
import { PrefixedStateReadWriter } from '../../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../../src/testing/in_memory_prefixed_state';
import { MainchainInteroperabilityModule, TokenMethod, TokenModule } from '../../../../../../src';
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
import { createTransactionContext } from '../../../../../../src/testing';
import { OwnChainAccountStore } from '../../../../../../src/modules/interoperability/stores/own_chain_account';
import { EMPTY_BYTES } from '../../../../../../src/modules/token/constants';
import { ChainAccountUpdatedEvent } from '../../../../../../src/modules/interoperability/events/chain_account_updated';
import { CcmSendSuccessEvent } from '../../../../../../src/modules/interoperability/events/ccm_send_success';
import { TOKEN_ID_LSK_MAINCHAIN } from '../../../../../../src/modules/interoperability/constants';

describe('Sidechain registration command', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const chainID = MAINCHAIN_ID_BUFFER;
	const newChainID = utils.intToBuffer(2, 4);
	const existingChainID = utils.intToBuffer(1, 4);
	const transactionParams = {
		name: 'sidechain',
		chainID: newChainID,
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
		sidechainRegistrationFee: REGISTRATION_FEE,
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
	const tokenModule = new TokenModule();
	const chainAccount: ChainAccount = {
		name: 'sidechain',
		lastCertificate: {
			height: 0,
			timestamp: 0,
			stateRoot: EMPTY_HASH,
			validatorsHash: computeValidatorsHash(
				transactionParams.initValidators,
				transactionParams.certificateThreshold,
			),
		},
		status: 0,
	};

	let sidechainRegistrationCommand: SidechainRegistrationCommand;
	let stateStore: PrefixedStateReadWriter;
	let nameSubstore: RegisteredNamesStore;
	let chainAccountSubstore: ChainAccountStore;
	let ownChainAccountSubstore: OwnChainAccountStore;
	let channelDataSubstore: ChannelDataStore;
	let outboxRootSubstore: OutboxRootStore;
	let chainValidatorsSubstore: ChainValidatorsStore;
	let registeredNamesSubstore: RegisteredNamesStore;
	let verifyContext: CommandVerifyContext<SidechainRegistrationParams>;
	let tokenMethod: TokenMethod;

	beforeEach(async () => {
		sidechainRegistrationCommand = new SidechainRegistrationCommand(
			interopMod.stores,
			interopMod.events,
			new Map(),
			new Map(),
		);

		// Set up dependencies
		tokenMethod = new TokenMethod(tokenModule.stores, tokenModule.events, tokenModule.name);
		jest.spyOn(tokenMethod, 'getAvailableBalance').mockResolvedValue(REGISTRATION_FEE);
		jest.spyOn(tokenMethod, 'burn').mockResolvedValue();
		sidechainRegistrationCommand.addDependencies(tokenMethod);

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
				`Invalid name property. It should contain only characters from the set [a-z0-9!@$&_.].`,
			);
		});

		it(`should return error if name is more than ${MAX_CHAIN_NAME_LENGTH} characters long`, async () => {
			verifyContext.params.name = new Array(MAX_CHAIN_NAME_LENGTH + 2).join('a');
			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`Property '.name' must NOT have more than ${MAX_CHAIN_NAME_LENGTH} characters`,
			);
		});

		it('should return error if store key name already exists in name store', async () => {
			await nameSubstore.set(
				createStoreGetter(stateStore),
				Buffer.from(transactionParams.name, 'utf8'),
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
			const invalidChain = Buffer.from([0x11, 0x01, 0x02, 0x01]);
			verifyContext.params.chainID = invalidChain;
			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Chain ID does not match the mainchain network.');
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

		it(`should return error if sidechainRegistrationFee is not equal ${REGISTRATION_FEE}`, async () => {
			verifyContext.params.sidechainRegistrationFee = BigInt(9);

			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`Sidechain registration fee must be equal to ${REGISTRATION_FEE}`,
			);
		});

		it(`should return error if available balance < ${REGISTRATION_FEE}`, async () => {
			const insufficientBalance = BigInt(0);
			jest.spyOn(tokenMethod, 'getAvailableBalance').mockResolvedValue(insufficientBalance);

			const result = await sidechainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`Sender does not have enough balance. Required: ${REGISTRATION_FEE}, found: ${insufficientBalance}`,
			);
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
						transactionParams.initValidators,
						transactionParams.certificateThreshold,
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
				messageFeeTokenID: TOKEN_ID_LSK_MAINCHAIN,
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
				activeValidators: transactionParams.initValidators,
				certificateThreshold: transactionParams.certificateThreshold,
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
				Buffer.from(transactionParams.name, 'utf-8'),
				expectedValue,
			);
		});

		it(`should burn the ${REGISTRATION_FEE}`, async () => {
			// Act
			await sidechainRegistrationCommand.execute(context);

			// Assert
			expect(tokenMethod.burn).toHaveBeenCalledWith(
				expect.anything(),
				transaction.senderAddress,
				Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]),
				REGISTRATION_FEE,
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
						transactionParams.initValidators,
						transactionParams.certificateThreshold,
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
				chainID: transactionParams.chainID,
				messageFeeTokenID: TOKEN_ID_LSK_MAINCHAIN,
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

			const ccmID = utils.hash(codec.encode(ccmSchema, ccm));

			// Act
			await sidechainRegistrationCommand.execute(context);

			// Assert
			expect(ccmSendSuccessEvent.log).toHaveBeenCalledWith(
				expect.anything(),
				chainID,
				newChainID,
				ccmID,
				{
					ccmID,
				},
			);
		});
	});
});
