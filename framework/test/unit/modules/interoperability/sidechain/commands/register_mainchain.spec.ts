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
import * as crypto from '@liskhq/lisk-cryptography';
import { Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { LiskValidationError } from '@liskhq/lisk-validator';
import { RegisterMainchainCommand } from '../../../../../../src/modules/interoperability/sidechain/commands/register_mainchain';
import {
	CCMStatusCode,
	COMMAND_NAME_MAINCHAIN_REG,
	CROSS_CHAIN_COMMAND_REGISTRATION,
	EMPTY_BYTES,
	EMPTY_HASH,
	EVENT_NAME_CCM_SEND_SUCCESS,
	EVENT_NAME_CHAIN_ACCOUNT_UPDATED,
	CHAIN_NAME_MAINCHAIN,
	MODULE_NAME_INTEROPERABILITY,
	NUMBER_ACTIVE_VALIDATORS_MAINCHAIN,
	MESSAGE_TAG_CHAIN_REG,
	THRESHOLD_MAINCHAIN,
	MAX_UINT64,
} from '../../../../../../src/modules/interoperability/constants';
import {
	mainchainRegParams,
	registrationCCMParamsSchema,
	registrationSignatureMessageSchema,
} from '../../../../../../src/modules/interoperability/schemas';
import {
	ActiveValidators,
	MainchainRegistrationParams,
	ValidatorsMethod,
} from '../../../../../../src/modules/interoperability/types';
import {
	VerifyStatus,
	CommandVerifyContext,
	CommandExecuteContext,
} from '../../../../../../src/state_machine';
import {
	computeValidatorsHash,
	sortValidatorsByBLSKey,
} from '../../../../../../src/modules/interoperability/utils';
import { SidechainInteroperabilityModule } from '../../../../../../src';
import { OwnChainAccountStore } from '../../../../../../src/modules/interoperability/stores/own_chain_account';
import { ChannelDataStore } from '../../../../../../src/modules/interoperability/stores/channel_data';
import { OutboxRootStore } from '../../../../../../src/modules/interoperability/stores/outbox_root';
import {
	ChainAccountStore,
	ChainStatus,
} from '../../../../../../src/modules/interoperability/stores/chain_account';
import { ChainValidatorsStore } from '../../../../../../src/modules/interoperability/stores/chain_validators';
import { createTransactionContext } from '../../../../../../src/testing';
import { ChainAccountUpdatedEvent } from '../../../../../../src/modules/interoperability/events/chain_account_updated';
import { PrefixedStateReadWriter } from '../../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../../src/testing/in_memory_prefixed_state';
import { InvalidRegistrationSignatureEvent } from '../../../../../../src/modules/interoperability/events/invalid_registration_signature';
import { CcmSendSuccessEvent } from '../../../../../../src/modules/interoperability/events/ccm_send_success';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('RegisterMainchainCommand', () => {
	const interopMod = new SidechainInteroperabilityModule();
	interopMod['internalMethod'] = { addToOutbox: jest.fn() } as any;
	const unsortedMainchainValidators: ActiveValidators[] = [];
	for (let i = 0; i < NUMBER_ACTIVE_VALIDATORS_MAINCHAIN; i += 1) {
		unsortedMainchainValidators.push({ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(1) });
	}
	const ownChainID = Buffer.from([0, 1, 0, 0]);
	const mainchainID = Buffer.from([0, 0, 0, 0]);
	const mainchainTokenID = Buffer.concat([mainchainID, Buffer.alloc(4)]);
	const mainchainValidators = sortValidatorsByBLSKey(unsortedMainchainValidators);
	const mainchainCertificateThreshold = BigInt(51);
	const transactionParams: MainchainRegistrationParams = {
		ownName: 'testchain',
		ownChainID,
		mainchainValidators,
		mainchainCertificateThreshold: BigInt(51),
		aggregationBits: Buffer.alloc(0),
		signature: Buffer.alloc(0),
	};
	const encodedTransactionParams = codec.encode(mainchainRegParams, transactionParams);
	const publicKey = utils.getRandomBytes(32);
	const transaction = new Transaction({
		module: MODULE_NAME_INTEROPERABILITY,
		command: COMMAND_NAME_MAINCHAIN_REG,
		senderPublicKey: publicKey,
		nonce: BigInt(0),
		fee: BigInt(100000000),
		params: encodedTransactionParams,
		signatures: [publicKey],
	});
	let mainchainRegistrationCommand: RegisterMainchainCommand;
	let verifyContext: CommandVerifyContext<MainchainRegistrationParams>;
	let ownChainAccountSubstore: OwnChainAccountStore;
	let chainAccountSubstore: ChainAccountStore;
	let stateStore: PrefixedStateReadWriter;
	let validatorsMethod: ValidatorsMethod;

	beforeEach(() => {
		mainchainRegistrationCommand = new RegisterMainchainCommand(
			interopMod.stores,
			interopMod.events,
			new Map(),
			new Map(),
			interopMod['internalMethod'],
		);
		validatorsMethod = {
			getValidatorKeys: jest.fn(),
			getValidatorsParams: jest.fn(),
		};
		mainchainRegistrationCommand.addDependencies(validatorsMethod);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		ownChainAccountSubstore = interopMod.stores.get(OwnChainAccountStore);
		chainAccountSubstore = interopMod.stores.get(ChainAccountStore);
	});

	describe('verify', () => {
		beforeEach(() => {
			jest.spyOn(ownChainAccountSubstore, 'get').mockResolvedValue({
				chainID: utils.intToBuffer(11, 4),
				name: 'testchain',
				nonce: BigInt(0),
			});
			verifyContext = createTransactionContext({
				chainID: ownChainID,
				transaction,
				stateStore,
			}).createCommandVerifyContext<MainchainRegistrationParams>(mainchainRegParams);
		});

		it('should return status OK for valid params', async () => {
			const result = await mainchainRegistrationCommand.verify(verifyContext);
			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should fail if mainchainID already exists in chain account substore', async () => {
			jest.spyOn(chainAccountSubstore, 'has').mockResolvedValue(true);
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Mainchain has already been registered.`);
		});

		it('should return error if own chain id is greater than 4 bytes', async () => {
			verifyContext.params.ownChainID = utils.getRandomBytes(5);
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Property '.ownChainID' maxLength exceeded`);
		});

		it('should return error if bls key is not 48 bytes', async () => {
			verifyContext.params.mainchainValidators[1].blsKey = utils.getRandomBytes(47);
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error).toBeInstanceOf(LiskValidationError);
		});

		it('should return error if name is greater than max length of name', async () => {
			verifyContext.params.ownName = utils.getRandomBytes(21).toString('hex');
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error).toBeInstanceOf(LiskValidationError);
		});

		it('should return error if own chain id does not match own chain account id', async () => {
			verifyContext.params.ownChainID = Buffer.from([0, 9, 9, 9]);
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Invalid ownChainID property.`);
		});

		it('should return error if name is invalid', async () => {
			verifyContext.params.ownName = '*@#&$_2';
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`Invalid ownName property. It should contain only characters from the set [a-z0-9!@$&_.].`,
			);
		});

		it('should return error if name is empty', async () => {
			verifyContext.params.ownName = '';
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error).toBeInstanceOf(LiskValidationError);
		});

		it('should return error if number of mainchain validators is zero', async () => {
			verifyContext.params.mainchainValidators = [];
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error).toBeInstanceOf(LiskValidationError);
		});

		it(`should return error if mainchainValidators array has more than ${NUMBER_ACTIVE_VALIDATORS_MAINCHAIN} elements`, async () => {
			verifyContext.params.mainchainValidators = [
				...mainchainValidators,
				{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(1) },
			];
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error).toBeInstanceOf(LiskValidationError);
		});

		it('should return error if bls keys are not lexicographically ordered', async () => {
			[verifyContext.params.mainchainValidators[0], verifyContext.params.mainchainValidators[1]] = [
				verifyContext.params.mainchainValidators[1],
				verifyContext.params.mainchainValidators[0],
			];
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Validators blsKeys must be unique and lexicographically ordered',
			);
		});

		it('should return error if duplicate bls keys', async () => {
			verifyContext.params.mainchainValidators[0].blsKey =
				verifyContext.params.mainchainValidators[1].blsKey;
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Validators blsKeys must be unique and lexicographically ordered',
			);
		});

		it('should return error if invalid bft weight', async () => {
			verifyContext.params.mainchainValidators[0].bftWeight = BigInt(0);
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Validator bft weight must be positive integer');
		});

		it(`should return error if total bft weight > ${MAX_UINT64}`, async () => {
			verifyContext.params.mainchainValidators[0].bftWeight = BigInt(MAX_UINT64);
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Total BFT weight exceeds maximum value.');
		});

		it('should return error if certificate threshold is too small', async () => {
			verifyContext.params.mainchainValidators[0].bftWeight = BigInt(10000000000);
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Certificate threshold is too small.');
		});

		it('should return error if certificate threshold is too large', async () => {
			verifyContext.params.mainchainCertificateThreshold = BigInt(10000000000);
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Certificate threshold is too large.');
		});
	});

	describe('execute', () => {
		const params = {
			ownChainID,
			ownName: 'testchain',
			mainchainValidators,
			aggregationBits: Buffer.alloc(0),
			signature: Buffer.alloc(0),
		};
		const chainAccount = {
			name: CHAIN_NAME_MAINCHAIN,
			lastCertificate: {
				height: 0,
				timestamp: 0,
				stateRoot: EMPTY_HASH,
				validatorsHash: computeValidatorsHash(mainchainValidators, BigInt(THRESHOLD_MAINCHAIN)),
			},
			status: ChainStatus.REGISTERED,
		};
		const blsKey1 = utils.getRandomBytes(48);
		const blsKey2 = utils.getRandomBytes(48);
		const validatorAccounts = [
			{
				address: utils.getRandomBytes(20),
				bftWeight: BigInt(10),
				generatorKey: utils.getRandomBytes(32),
				blsKey: blsKey1,
			},
			{
				address: utils.getRandomBytes(20),
				bftWeight: BigInt(5),
				generatorKey: utils.getRandomBytes(32),
				blsKey: blsKey2,
			},
		];
		validatorAccounts.sort((a, b) => a.blsKey.compare(b.blsKey));
		let context: CommandExecuteContext<MainchainRegistrationParams>;
		let channelDataSubstore: ChannelDataStore;
		let outboxRootSubstore: OutboxRootStore;
		let chainDataSubstore: ChainAccountStore;
		let chainValidatorsSubstore: ChainValidatorsStore;
		let chainAccountUpdatedEvent: ChainAccountUpdatedEvent;
		let ccmSendSuccessEvent: CcmSendSuccessEvent;
		let invalidRegistrationSignatureEvent: InvalidRegistrationSignatureEvent;

		beforeEach(() => {
			channelDataSubstore = interopMod.stores.get(ChannelDataStore);
			chainValidatorsSubstore = interopMod.stores.get(ChainValidatorsStore);
			outboxRootSubstore = interopMod.stores.get(OutboxRootStore);
			chainDataSubstore = interopMod.stores.get(ChainAccountStore);
			chainAccountUpdatedEvent = interopMod.events.get(ChainAccountUpdatedEvent);
			ccmSendSuccessEvent = interopMod.events.get(CcmSendSuccessEvent);
			invalidRegistrationSignatureEvent = interopMod.events.get(InvalidRegistrationSignatureEvent);
			jest.spyOn(chainDataSubstore, 'set');
			jest.spyOn(channelDataSubstore, 'set');
			jest.spyOn(chainValidatorsSubstore, 'set');
			jest.spyOn(outboxRootSubstore, 'set');
			jest.spyOn(ownChainAccountSubstore, 'set');
			jest.spyOn(chainAccountUpdatedEvent, 'log');
			jest.spyOn(ccmSendSuccessEvent, 'log');
			jest.spyOn(invalidRegistrationSignatureEvent, 'error');
			jest.spyOn(crypto.bls, 'verifyWeightedAggSig').mockReturnValue(true);

			(validatorsMethod.getValidatorsParams as jest.Mock).mockResolvedValue({
				certificateThreshold: BigInt(40),
				validators: validatorAccounts,
			});
			context = createTransactionContext({
				chainID: ownChainID,
				transaction,
			}).createCommandExecuteContext(mainchainRegParams);
		});

		it('should call verifyWeightedAggSig with appropriate parameters', async () => {
			// Arrange
			const message = codec.encode(registrationSignatureMessageSchema, {
				ownName: params.ownName,
				ownChainID: params.ownChainID,
				mainchainValidators,
				mainchainCertificateThreshold,
			});

			const keyList = [validatorAccounts[0].blsKey, validatorAccounts[1].blsKey];
			const weights = [validatorAccounts[0].bftWeight, validatorAccounts[1].bftWeight];

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(crypto.bls.verifyWeightedAggSig).toHaveBeenCalledWith(
				keyList,
				params.aggregationBits,
				params.signature,
				MESSAGE_TAG_CHAIN_REG,
				context.params.ownChainID,
				message,
				weights,
				BigInt(40),
			);
		});

		it('should throw and emit corresponding event if verifyWeightedAggSig returns false', async () => {
			// Arrange
			jest.spyOn(crypto.bls, 'verifyWeightedAggSig').mockReturnValue(false);
			jest.spyOn(context.eventQueue, 'add');

			// Act & Assert
			await expect(mainchainRegistrationCommand.execute(context)).rejects.toThrow(
				'Invalid signature property.',
			);
			expect(invalidRegistrationSignatureEvent.error).toHaveBeenCalledWith(
				expect.anything(),
				params.ownChainID,
			);
		});

		it('should add an entry to chain account substore', async () => {
			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(chainDataSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				mainchainID,
				chainAccount,
			);
		});

		it('should add an entry to channel substore', async () => {
			// Arrange
			const expectedValue = {
				inbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				outbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				partnerChainOutboxRoot: EMPTY_HASH,
				messageFeeTokenID: mainchainTokenID,
			};

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(channelDataSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				mainchainID,
				expectedValue,
			);
		});

		it('should add an entry to chain validators substore', async () => {
			// Arrange
			const expectedValue = {
				activeValidators: mainchainValidators,
				certificateThreshold: mainchainCertificateThreshold,
			};

			// Act
			await mainchainRegistrationCommand.execute(context);
			expect(chainValidatorsSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				mainchainID,
				expectedValue,
			);
		});

		it('should add an entry to outbox root substore', async () => {
			// Arrange
			const expectedValue = { root: EMPTY_HASH };

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(outboxRootSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				mainchainID,
				expectedValue,
			);
		});

		it('should add an entry to own chain account substore', async () => {
			// Arrange
			const expectedValue = { name: params.ownName, chainID: params.ownChainID, nonce: BigInt(1) };

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(ownChainAccountSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				EMPTY_BYTES,
				expectedValue,
			);
		});

		it(`should emit ${EVENT_NAME_CHAIN_ACCOUNT_UPDATED} event`, async () => {
			const mainchainAccount = {
				name: CHAIN_NAME_MAINCHAIN,
				lastCertificate: {
					height: 0,
					timestamp: 0,
					stateRoot: EMPTY_HASH,
					validatorsHash: computeValidatorsHash(mainchainValidators, BigInt(THRESHOLD_MAINCHAIN)),
				},
				status: ChainStatus.REGISTERED,
			};
			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(chainAccountUpdatedEvent.log).toHaveBeenCalledWith(
				expect.anything(),
				mainchainID,
				mainchainAccount,
			);
		});

		it('should call addToOutbox with an appropriate ccm', async () => {
			// Arrange
			const encodedParams = codec.encode(registrationCCMParamsSchema, {
				name: CHAIN_NAME_MAINCHAIN,
				messageFeeTokenID: mainchainTokenID,
			});
			const ccm = {
				nonce: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
				sendingChainID: params.ownChainID,
				receivingChainID: mainchainID,
				fee: BigInt(0),
				status: CCMStatusCode.OK,
				params: encodedParams,
			};

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(interopMod['internalMethod'].addToOutbox).toHaveBeenCalledWith(
				expect.anything(),
				mainchainID,
				ccm,
			);
		});

		it('should update nonce in own chain acount substore', async () => {
			// Arrange
			const expectedValue = { name: params.ownName, chainID: params.ownChainID, nonce: BigInt(1) };

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(ownChainAccountSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				EMPTY_BYTES,
				expectedValue,
			);
		});

		it(`should emit ${EVENT_NAME_CCM_SEND_SUCCESS} event`, async () => {
			const encodedParams = codec.encode(registrationCCMParamsSchema, {
				name: CHAIN_NAME_MAINCHAIN,
				messageFeeTokenID: mainchainTokenID,
			});
			const ownChainAccount = {
				name: params.ownName,
				chainID: params.ownChainID,
				nonce: BigInt(0),
			};
			const ccm = {
				nonce: ownChainAccount.nonce,
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
				sendingChainID: ownChainAccount.chainID,
				receivingChainID: mainchainID,
				fee: BigInt(0),
				status: CCMStatusCode.OK,
				params: encodedParams,
			};

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(ccmSendSuccessEvent.log).toHaveBeenCalledWith(
				expect.anything(),
				ownChainAccount.chainID,
				mainchainID,
				expect.anything(),
				{
					ccm,
				},
			);
		});
	});
});
