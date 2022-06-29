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

import { intToBuffer } from '@liskhq/lisk-cryptography';
import * as crypto from '@liskhq/lisk-cryptography';
import { Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { LiskValidationError } from '@liskhq/lisk-validator';
import { when } from 'jest-when';
import * as testing from '../../../../../../src/testing';
import { MainchainRegistrationCommand } from '../../../../../../src/modules/interoperability/sidechain/commands/mainchain_registration';
import {
	CCM_STATUS_OK,
	CHAIN_REGISTERED,
	COMMAND_ID_MAINCHAIN_REG_BUFFER,
	CROSS_CHAIN_COMMAND_ID_REGISTRATION_BUFFER,
	EMPTY_FEE_ADDRESS,
	EMPTY_HASH,
	MAINCHAIN_ID,
	MAINCHAIN_ID_BUFFER,
	MAINCHAIN_NAME,
	MAINCHAIN_NETWORK_ID,
	MAX_UINT32,
	MODULE_ID_INTEROPERABILITY_BUFFER,
	NUMBER_MAINCHAIN_VALIDATORS,
	STORE_PREFIX_CHAIN_DATA,
	STORE_PREFIX_CHAIN_VALIDATORS,
	STORE_PREFIX_CHANNEL_DATA,
	STORE_PREFIX_OUTBOX_ROOT,
	STORE_PREFIX_OWN_CHAIN_DATA,
	TAG_CHAIN_REG_MESSAGE,
	THRESHOLD_MAINCHAIN,
} from '../../../../../../src/modules/interoperability/constants';
import {
	chainAccountSchema,
	channelSchema,
	mainchainRegParams,
	outboxRootSchema,
	ownChainAccountSchema,
	registrationCCMParamsSchema,
	registrationSignatureMessageSchema,
	validatorsSchema,
} from '../../../../../../src/modules/interoperability/schema';
import {
	ActiveValidators,
	MainchainRegistrationParams,
} from '../../../../../../src/modules/interoperability/types';
import { VerifyStatus, CommandVerifyContext } from '../../../../../../src/state_machine';
import {
	computeValidatorsHash,
	getIDAsKeyForStore,
	sortValidatorsByBLSKey,
} from '../../../../../../src/modules/interoperability/utils';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('Mainchain registration command', () => {
	const { getRandomBytes } = crypto;
	const unsortedMainchainValidators: ActiveValidators[] = [];
	for (let i = 0; i < NUMBER_MAINCHAIN_VALIDATORS; i += 1) {
		unsortedMainchainValidators.push({ blsKey: getRandomBytes(48), bftWeight: BigInt(1) });
	}
	const mainchainValidators = sortValidatorsByBLSKey(unsortedMainchainValidators);
	const transactionParams: MainchainRegistrationParams = {
		ownChainID: intToBuffer(11, 4),
		ownName: 'testchain',
		mainchainValidators,
		aggregationBits: Buffer.alloc(0),
		signature: Buffer.alloc(0),
	};
	const encodedTransactionParams = codec.encode(mainchainRegParams, transactionParams);
	const publicKey = getRandomBytes(32);
	const transaction = new Transaction({
		moduleID: MODULE_ID_INTEROPERABILITY_BUFFER,
		commandID: COMMAND_ID_MAINCHAIN_REG_BUFFER,
		senderPublicKey: publicKey,
		nonce: BigInt(0),
		fee: BigInt(100000000),
		params: encodedTransactionParams,
		signatures: [publicKey],
	});
	const networkIdentifier = Buffer.from(
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
		'hex',
	);
	let mainchainRegistrationCommand: MainchainRegistrationCommand;
	let verifyContext: CommandVerifyContext<MainchainRegistrationParams>;

	beforeEach(() => {
		mainchainRegistrationCommand = new MainchainRegistrationCommand(
			MODULE_ID_INTEROPERABILITY_BUFFER,
			new Map(),
			new Map(),
		);
	});

	describe('verify', () => {
		beforeEach(() => {
			verifyContext = testing
				.createTransactionContext({
					transaction,
					networkIdentifier,
					certificateThreshold: BigInt(40),
					currentValidators: [
						{
							address: getRandomBytes(20),
							bftWeight: BigInt(10),
							blsKey: getRandomBytes(48),
							generatorKey: getRandomBytes(32),
						},
						{
							address: getRandomBytes(20),
							bftWeight: BigInt(5),
							generatorKey: getRandomBytes(32),
							blsKey: getRandomBytes(48),
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
			const maxIntBuffer = intToBuffer(MAX_UINT32, 4);
			verifyContext.params.ownChainID = Buffer.concat([maxIntBuffer, intToBuffer(5, 4)]);
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error).toBeInstanceOf(LiskValidationError);
		});

		it('should return error if bls key is not 48 bytes', async () => {
			verifyContext.params.mainchainValidators[1].blsKey = getRandomBytes(47);
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error).toBeInstanceOf(LiskValidationError);
		});

		it('should return error if name is greater than max length of name', async () => {
			verifyContext.params.ownName = getRandomBytes(21).toString('hex');
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
			ownChainID: intToBuffer(11, 4),
			ownName: 'testchain',
			mainchainValidators,
			aggregationBits: Buffer.alloc(0),
			signature: Buffer.alloc(0),
		};
		const chainAccount = {
			name: MAINCHAIN_NAME,
			networkID: MAINCHAIN_NETWORK_ID,
			lastCertificate: {
				height: 0,
				timestamp: 0,
				stateRoot: EMPTY_HASH,
				validatorsHash: computeValidatorsHash(mainchainValidators, BigInt(THRESHOLD_MAINCHAIN)),
			},
			status: CHAIN_REGISTERED,
		};
		const blsKey1 = getRandomBytes(48);
		const blsKey2 = getRandomBytes(48);
		const validatorAccounts = [
			{
				address: getRandomBytes(20),
				bftWeight: BigInt(10),
				generatorKey: getRandomBytes(32),
				blsKey: blsKey1,
			},
			{
				address: getRandomBytes(20),
				bftWeight: BigInt(5),
				generatorKey: getRandomBytes(32),
				blsKey: blsKey2,
			},
		];
		validatorAccounts.sort((a, b) => a.blsKey.compare(b.blsKey));
		const mockGetStore = jest.fn();
		const context = {
			logger: jest.fn(),
			eventQueue: jest.fn(),
			networkIdentifier: Buffer.alloc(0),
			header: { timestamp: Date.now() },
			assets: {},
			transaction,
			params,
			getAPIContext: jest.fn(),
			getStore: mockGetStore,
			certificateThreshold: BigInt(40),
			currentValidators: validatorAccounts,
		} as any;
		const chainSubstore = {
			setWithSchema: jest.fn(),
		};
		const channelSubstore = {
			setWithSchema: jest.fn(),
		};
		const validatorsSubstore = {
			setWithSchema: jest.fn(),
		};
		const outboxRootSubstore = { setWithSchema: jest.fn() };
		const ownChainAccountSubstore = {
			setWithSchema: jest.fn(),
		};
		const sendInternal = jest.fn();

		beforeEach(() => {
			mainchainRegistrationCommand['getInteroperabilityStore'] = jest
				.fn()
				.mockReturnValue({ sendInternal });
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_CHAIN_DATA)
				.mockReturnValue(chainSubstore);
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_CHANNEL_DATA)
				.mockReturnValue(channelSubstore);
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_CHAIN_VALIDATORS)
				.mockReturnValue(validatorsSubstore);
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_OUTBOX_ROOT)
				.mockReturnValue(outboxRootSubstore);
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_OWN_CHAIN_DATA)
				.mockReturnValue(ownChainAccountSubstore);
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

			jest.spyOn(crypto, 'verifyWeightedAggSig');

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(crypto.verifyWeightedAggSig).toHaveBeenCalledWith(
				keyList,
				params.aggregationBits,
				params.signature,
				TAG_CHAIN_REG_MESSAGE,
				context.networkIdentifier,
				message,
				weights,
				BigInt(40),
			);
		});

		it('should add an entry to chain account substore', async () => {
			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(chainSubstore.setWithSchema).toHaveBeenCalledWith(
				mainchainIdAsKey,
				chainAccount,
				chainAccountSchema,
			);
		});

		it('should add an entry to channel account substore', async () => {
			// Arrange
			const expectedValue = {
				inbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				outbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				partnerChainOutboxRoot: EMPTY_HASH,
				messageFeeTokenID: { chainID: MAINCHAIN_ID_BUFFER, localID: intToBuffer(0, 4) },
			};

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(channelSubstore.setWithSchema).toHaveBeenCalledWith(
				mainchainIdAsKey,
				expectedValue,
				channelSchema,
			);
		});

		it('should call sendInternal with a registration ccm', async () => {
			const receivingChainID = MAINCHAIN_ID_BUFFER;
			const encodedParams = codec.encode(registrationCCMParamsSchema, {
				networkID: MAINCHAIN_NETWORK_ID,
				name: MAINCHAIN_NAME,
				messageFeeTokenID: { chainID: MAINCHAIN_ID_BUFFER, localID: intToBuffer(0, 4) },
			});
			const ccm = {
				nonce: BigInt(0),
				moduleID: MODULE_ID_INTEROPERABILITY_BUFFER,
				crossChainCommandID: CROSS_CHAIN_COMMAND_ID_REGISTRATION_BUFFER,
				sendingChainID: params.ownChainID,
				receivingChainID,
				fee: BigInt(0),
				status: CCM_STATUS_OK,
				params: encodedParams,
			};
			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(sendInternal).toHaveBeenCalledWith({
				moduleID: MODULE_ID_INTEROPERABILITY_BUFFER,
				crossChainCommandID: CROSS_CHAIN_COMMAND_ID_REGISTRATION_BUFFER,
				receivingChainID,
				fee: BigInt(0),
				status: CCM_STATUS_OK,
				params: encodedParams,
				beforeSendContext: { ...context, ccm, feeAddress: EMPTY_FEE_ADDRESS },
			});
		});

		it('should add an entry to chain validators substore', async () => {
			// Arrange
			const expectedValue = {
				mainchainValidators: {
					activeValidators: mainchainValidators,
					certificateThreshold: BigInt(THRESHOLD_MAINCHAIN),
				},
			};

			// Act
			await mainchainRegistrationCommand.execute(context);
			expect(validatorsSubstore.setWithSchema).toHaveBeenCalledWith(
				mainchainIdAsKey,
				expectedValue,
				validatorsSchema,
			);
		});

		it('should add an entry to outbox root substore', async () => {
			// Arrange
			const expectedValue = { root: EMPTY_HASH };

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(outboxRootSubstore.setWithSchema).toHaveBeenCalledWith(
				mainchainIdAsKey,
				expectedValue,
				outboxRootSchema,
			);
		});

		it('should add an entry to registered names substore', async () => {
			// Arrange
			const expectedValue = { name: params.ownName, id: params.ownChainID, nonce: BigInt(0) };

			// Act
			await mainchainRegistrationCommand.execute(context);

			// Assert
			expect(ownChainAccountSubstore.setWithSchema).toHaveBeenCalledWith(
				getIDAsKeyForStore(0),
				expectedValue,
				ownChainAccountSchema,
			);
		});
	});
});
