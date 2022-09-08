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
import * as testing from '../../../../../../src/testing';
import { MainchainRegistrationCommand } from '../../../../../../src/modules/interoperability/sidechain/commands/mainchain_registration';
import {
	CCM_STATUS_OK,
	CHAIN_REGISTERED,
	COMMAND_NAME_MAINCHAIN_REG,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	EMPTY_FEE_ADDRESS,
	EMPTY_HASH,
	MAINCHAIN_ID,
	MAINCHAIN_ID_BUFFER,
	MAINCHAIN_NAME,
	MAINCHAIN_NETWORK_ID,
	MAX_UINT32,
	MODULE_NAME_INTEROPERABILITY,
	NUMBER_MAINCHAIN_VALIDATORS,
	TAG_CHAIN_REG_MESSAGE,
	THRESHOLD_MAINCHAIN,
} from '../../../../../../src/modules/interoperability/constants';
import {
	mainchainRegParams,
	registrationCCMParamsSchema,
	registrationSignatureMessageSchema,
} from '../../../../../../src/modules/interoperability/schemas';
import {
	ActiveValidators,
	MainchainRegistrationParams,
	SendInternalContext,
} from '../../../../../../src/modules/interoperability/types';
import {
	VerifyStatus,
	CommandVerifyContext,
	CommandExecuteContext,
} from '../../../../../../src/state_machine';
import {
	computeValidatorsHash,
	getIDAsKeyForStore,
	sortValidatorsByBLSKey,
} from '../../../../../../src/modules/interoperability/utils';
import { SidechainInteroperabilityModule } from '../../../../../../src';
import { OwnChainAccountStore } from '../../../../../../src/modules/interoperability/stores/own_chain_account';
import { ChannelDataStore } from '../../../../../../src/modules/interoperability/stores/channel_data';
import { OutboxRootStore } from '../../../../../../src/modules/interoperability/stores/outbox_root';
import { ChainAccountStore } from '../../../../../../src/modules/interoperability/stores/chain_account';
import { ChainValidatorsStore } from '../../../../../../src/modules/interoperability/stores/chain_validators';
import { createTransactionContext } from '../../../../../../src/testing';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

// TODO: Unskip and update for networkIdentifier in issue #7442
describe.skip('Mainchain registration command', () => {
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
	const chainID = Buffer.from(
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
		'hex',
	);
	let mainchainRegistrationCommand: MainchainRegistrationCommand;
	let verifyContext: CommandVerifyContext<MainchainRegistrationParams>;

	beforeEach(() => {
		mainchainRegistrationCommand = new MainchainRegistrationCommand(
			interopMod.stores,
			interopMod.events,
			new Map(),
			new Map(),
		);
	});

	describe('verify', () => {
		beforeEach(() => {
			verifyContext = testing
				.createTransactionContext({
					transaction,
					chainID,
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
				})
				.createCommandVerifyContext<MainchainRegistrationParams>(mainchainRegParams);
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

		it('should return error if name is invalid', async () => {
			verifyContext.params.ownName = '*@#&$_2';
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`Sidechain name is in an unsupported format: *@#&$_2`,
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
		const mainchainIdAsKey = getIDAsKeyForStore(MAINCHAIN_ID);
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
			status: CHAIN_REGISTERED,
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
		let ownChainAccountSubstore: OwnChainAccountStore;
		const sendInternal = jest.fn();

		beforeEach(() => {
			mainchainRegistrationCommand['getInteroperabilityStore'] = jest
				.fn()
				.mockReturnValue({ sendInternal });
			channelDataSubstore = interopMod.stores.get(ChannelDataStore);
			chainValidatorsSubstore = interopMod.stores.get(ChainValidatorsStore);
			outboxRootSubstore = interopMod.stores.get(OutboxRootStore);
			chainDataSubstore = interopMod.stores.get(ChainAccountStore);
			ownChainAccountSubstore = interopMod.stores.get(OwnChainAccountStore);

			context = createTransactionContext({
				certificateThreshold: BigInt(40),
				currentValidators: validatorAccounts,
				transaction,
			}).createCommandExecuteContext(mainchainRegParams);

			jest.spyOn(chainDataSubstore, 'set');
			jest.spyOn(channelDataSubstore, 'set');
			jest.spyOn(chainValidatorsSubstore, 'set');
			jest.spyOn(outboxRootSubstore, 'set');
			jest.spyOn(ownChainAccountSubstore, 'set');
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

			jest.spyOn(crypto.bls, 'verifyWeightedAggSig');

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(crypto.bls.verifyWeightedAggSig).toHaveBeenCalledWith(
				keyList,
				params.aggregationBits,
				params.signature,
				TAG_CHAIN_REG_MESSAGE,
				context.chainID,
				message,
				weights,
				BigInt(40),
			);
		});

		it('should add an entry to chain account substore', async () => {
			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(chainDataSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				mainchainIdAsKey,
				chainAccount,
			);
		});

		it('should add an entry to channel account substore', async () => {
			// Arrange
			const expectedValue = {
				inbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				outbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				partnerChainOutboxRoot: EMPTY_HASH,
				messageFeeTokenID: { chainID: MAINCHAIN_ID_BUFFER, localID: utils.intToBuffer(0, 4) },
			};

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(channelDataSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				mainchainIdAsKey,
				expectedValue,
			);
		});

		it('should call sendInternal with a registration ccm', async () => {
			const receivingChainID = MAINCHAIN_ID_BUFFER;
			const encodedParams = codec.encode(registrationCCMParamsSchema, {
				networkID: MAINCHAIN_NETWORK_ID,
				name: MAINCHAIN_NAME,
				messageFeeTokenID: { chainID: MAINCHAIN_ID_BUFFER, localID: utils.intToBuffer(0, 4) },
			});
			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(sendInternal).toHaveBeenCalledWith({
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
				receivingChainID,
				fee: BigInt(0),
				status: CCM_STATUS_OK,
				params: encodedParams,
				feeAddress: EMPTY_FEE_ADDRESS,
				eventQueue: context.eventQueue,
				getMethodContext: context.getMethodContext,
				getStore: context.getStore,
				logger: context.logger,
				chainID: context.chainID,
			} as SendInternalContext);
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
				mainchainIdAsKey,
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
				mainchainIdAsKey,
				expectedValue,
			);
		});

		it('should add an entry to registered names substore', async () => {
			// Arrange
			const expectedValue = { name: params.ownName, id: params.ownChainID, nonce: BigInt(0) };

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(ownChainAccountSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				getIDAsKeyForStore(0),
				expectedValue,
			);
		});
	});
});
