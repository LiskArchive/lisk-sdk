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
import { MainchainRegistrationCommand } from '../../../../../../src/modules/interoperability/sidechain/commands/mainchain_registration';
import {
	CCMStatusCode,
	COMMAND_NAME_MAINCHAIN_REG,
	CROSS_CHAIN_COMMAND_REGISTRATION,
	EMPTY_BYTES,
	EMPTY_HASH,
	EVENT_NAME_CCM_SEND_SUCCESS,
	EVENT_NAME_CHAIN_ACCOUNT_UPDATED,
	MAINCHAIN_ID_BUFFER,
	MAINCHAIN_NAME,
	MAX_UINT32,
	MODULE_NAME_INTEROPERABILITY,
	NUMBER_MAINCHAIN_VALIDATORS,
	TAG_CHAIN_REG_MESSAGE,
	THRESHOLD_MAINCHAIN,
	TOKEN_ID_LSK_MAINCHAIN,
} from '../../../../../../src/modules/interoperability/constants';
import {
	ccmSchema,
	mainchainRegParams,
	registrationCCMParamsSchema,
	registrationSignatureMessageSchema,
} from '../../../../../../src/modules/interoperability/schemas';
import {
	ActiveValidators,
	MainchainRegistrationParams,
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

describe('Mainchain registration command', () => {
	const interopMod = new SidechainInteroperabilityModule();

	const unsortedMainchainValidators: ActiveValidators[] = [];
	for (let i = 0; i < NUMBER_MAINCHAIN_VALIDATORS; i += 1) {
		unsortedMainchainValidators.push({ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(1) });
	}
	const mainchainValidators = sortValidatorsByBLSKey(unsortedMainchainValidators);
	const transactionParams: MainchainRegistrationParams = {
		ownChainID: utils.intToBuffer(11, 4),
		ownName: 'testchain',
		mainchainValidators,
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
	let mainchainRegistrationCommand: MainchainRegistrationCommand;
	let verifyContext: CommandVerifyContext<MainchainRegistrationParams>;
	let ownChainAccountSubstore: OwnChainAccountStore;
	let stateStore: PrefixedStateReadWriter;

	beforeEach(() => {
		mainchainRegistrationCommand = new MainchainRegistrationCommand(
			interopMod.stores,
			interopMod.events,
			new Map(),
			new Map(),
		);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		ownChainAccountSubstore = interopMod.stores.get(OwnChainAccountStore);
	});

	describe('verify', () => {
		beforeEach(() => {
			jest.spyOn(ownChainAccountSubstore, 'get').mockResolvedValue({
				chainID: utils.intToBuffer(11, 4),
				name: 'testchain',
				nonce: BigInt(0),
			});
			verifyContext = createTransactionContext({
				transaction,
				certificateThreshold: BigInt(40),
				currentValidators: [
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(10),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
					},
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(5),
						generatorKey: utils.getRandomBytes(32),
						blsKey: utils.getRandomBytes(48),
					},
				],
				stateStore,
			}).createCommandVerifyContext<MainchainRegistrationParams>(mainchainRegParams);
		});

		it('should return status OK for valid params', async () => {
			const result = await mainchainRegistrationCommand.verify(verifyContext);
			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return error if own chain id is greater than maximum uint32 number', async () => {
			verifyContext.params.ownChainID = utils.intToBuffer(MAX_UINT32 + 1, 5);
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`Own chain id cannot be greater than maximum uint32 number.`,
			);
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
			verifyContext.params.ownChainID = utils.intToBuffer(10, 4);
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

		it('should return error if number of mainchain validators is not equal to number of mainchain validators', async () => {
			verifyContext.params.mainchainValidators.pop();
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
			verifyContext.params.mainchainValidators[0].bftWeight = BigInt(5);
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Validator bft weight must be equal to 1');
		});
	});

	describe('execute', () => {
		const params = {
			ownChainID: utils.intToBuffer(11, 4),
			ownName: 'testchain',
			mainchainValidators,
			aggregationBits: Buffer.alloc(0),
			signature: Buffer.alloc(0),
		};
		const chainAccount = {
			name: MAINCHAIN_NAME,
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
			jest.spyOn(invalidRegistrationSignatureEvent, 'log');
			jest.spyOn(crypto.bls, 'verifyWeightedAggSig').mockReturnValue(true);

			context = createTransactionContext({
				certificateThreshold: BigInt(40),
				currentValidators: validatorAccounts,
				transaction,
			}).createCommandExecuteContext(mainchainRegParams);
		});

		it('should call verifyWeightedAggSig with appropriate parameters', async () => {
			// Arrange
			const message = codec.encode(registrationSignatureMessageSchema, {
				ownChainID: params.ownChainID,
				ownName: params.ownName,
				mainchainValidators,
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
				TAG_CHAIN_REG_MESSAGE,
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
			expect(invalidRegistrationSignatureEvent.log).toHaveBeenCalledWith(
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
				MAINCHAIN_ID_BUFFER,
				chainAccount,
			);
		});

		it('should add an entry to channel substore', async () => {
			// Arrange
			const expectedValue = {
				inbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				outbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				partnerChainOutboxRoot: EMPTY_HASH,
				messageFeeTokenID: TOKEN_ID_LSK_MAINCHAIN,
			};

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(channelDataSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				MAINCHAIN_ID_BUFFER,
				expectedValue,
			);
		});

		it('should add an entry to chain validators substore', async () => {
			// Arrange
			const expectedValue = {
				activeValidators: mainchainValidators,
				certificateThreshold: BigInt(THRESHOLD_MAINCHAIN),
			};

			// Act
			await mainchainRegistrationCommand.execute(context);
			expect(chainValidatorsSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				MAINCHAIN_ID_BUFFER,
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
				MAINCHAIN_ID_BUFFER,
				expectedValue,
			);
		});

		it('should add an entry to own chain account substore', async () => {
			// Arrange
			const expectedValue = { name: params.ownName, chainID: params.ownChainID, nonce: BigInt(0) };

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
				name: MAINCHAIN_NAME,
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
				MAINCHAIN_ID_BUFFER,
				mainchainAccount,
			);
		});

		it('should call addToOutbox with an appropriate ccm', async () => {
			// Arrange
			const interopStore = { addToOutbox: jest.fn() };
			mainchainRegistrationCommand['getInteroperabilityInternalMethod'] = jest
				.fn()
				.mockReturnValue(interopStore);
			const encodedParams = codec.encode(registrationCCMParamsSchema, {
				chainID: MAINCHAIN_ID_BUFFER,
				name: MAINCHAIN_NAME,
				messageFeeTokenID: TOKEN_ID_LSK_MAINCHAIN,
			});
			const ccm = {
				nonce: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
				sendingChainID: params.ownChainID,
				receivingChainID: MAINCHAIN_ID_BUFFER,
				fee: BigInt(0),
				status: CCMStatusCode.OK,
				params: encodedParams,
			};

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(interopStore.addToOutbox).toHaveBeenCalledWith(MAINCHAIN_ID_BUFFER, ccm);
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
				chainID: MAINCHAIN_ID_BUFFER,
				name: MAINCHAIN_NAME,
				messageFeeTokenID: TOKEN_ID_LSK_MAINCHAIN,
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
				receivingChainID: MAINCHAIN_ID_BUFFER,
				fee: BigInt(0),
				status: CCMStatusCode.OK,
				params: encodedParams,
			};
			const ccmID = utils.hash(codec.encode(ccmSchema, ccm));

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(ccmSendSuccessEvent.log).toHaveBeenCalledWith(
				expect.anything(),
				ownChainAccount.chainID,
				MAINCHAIN_ID_BUFFER,
				ccmID,
				{
					ccmID,
				},
			);
		});
	});
});
