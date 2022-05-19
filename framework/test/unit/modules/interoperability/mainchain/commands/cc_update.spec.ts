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

import { when } from 'jest-when';
import * as cryptography from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { CommandVerifyContext, testing, VerifyStatus } from '../../../../../../src';
import {
	ActiveValidator,
	ChainAccount,
	ChannelData,
	CrossChainUpdateTransactionParams,
} from '../../../../../../src/modules/interoperability/types';
import { MainchainCCUpdateCommand } from '../../../../../../src/modules/interoperability/mainchain/commands/cc_update';
import { Certificate } from '../../../../../../src/node/consensus/certificate_generation/types';
import { certificateSchema } from '../../../../../../src/node/consensus/certificate_generation/schema';
import * as interopUtils from '../../../../../../src/modules/interoperability/utils';
import {
	chainAccountSchema,
	channelSchema,
} from '../../../../../../src/modules/interoperability/schema';
import {
	CHAIN_ACTIVE,
	CHAIN_REGISTERED,
	CHAIN_TERMINATED,
	EMPTY_BYTES,
	STORE_PREFIX_CHAIN_DATA,
	STORE_PREFIX_CHANNEL_DATA,
} from '../../../../../../src/modules/interoperability/constants';
import { MainchainInteroperabilityStore } from '../../../../../../src/modules/interoperability/mainchain/store';

describe('CrossChainUpdateCommand', () => {
	const getAPIContextMock = jest.fn();
	const getStoreMock = jest.fn();
	const moduleID = 1;
	const networkIdentifier = cryptography.getRandomBytes(32);
	const defaultCertificateValues: Certificate = {
		blockID: cryptography.getRandomBytes(20),
		height: 21,
		stateRoot: cryptography.getRandomBytes(38),
		timestamp: Date.now(),
		validatorsHash: cryptography.getRandomBytes(48),
		aggregationBits: cryptography.getRandomBytes(38),
		signature: cryptography.getRandomBytes(32),
	};
	const defaultNewCertificateThreshold = BigInt(20);
	const defaultSendingChainID = 20;
	const defaultSendingChainIDBuffer = interopUtils.getIDAsKeyForStore(defaultSendingChainID);
	const defaultInboxUpdateValue = {
		crossChainMessages: [Buffer.alloc(1)],
		messageWitness: {
			partnerChainOutboxSize: BigInt(2),
			siblingHashes: [Buffer.alloc(1)],
		},
		outboxRootWitness: {
			bitmap: Buffer.alloc(1),
			siblingHashes: [Buffer.alloc(1)],
		},
	};
	const defaultTransaction = { moduleID: 1 };

	const encodedDefaultCertificate = codec.encode(certificateSchema, defaultCertificateValues);

	const partnerChainStore = {
		getWithSchema: jest.fn(),
	};

	const partnerChannelStore = {
		getWithSchema: jest.fn(),
	};

	let partnerChainAccount: ChainAccount;
	let partnerChannelAccount: ChannelData;
	let context: CommandVerifyContext<CrossChainUpdateTransactionParams>;
	let mainchainCCUUpdateCommand: MainchainCCUpdateCommand;
	let params: CrossChainUpdateTransactionParams;
	let activeValidatorsUpdate: ActiveValidator[];
	let sortedActiveValidatorsUpdate: ActiveValidator[];
	// let paramCertificate: Certificate;

	beforeEach(async () => {
		activeValidatorsUpdate = [
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(1) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(4) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) },
		];
		sortedActiveValidatorsUpdate = [...activeValidatorsUpdate].sort((v1, v2) =>
			v1.blsKey.compare(v2.blsKey),
		);
		partnerChainAccount = {
			lastCertificate: {
				height: 10,
				stateRoot: cryptography.getRandomBytes(38),
				timestamp: Date.now(),
				validatorsHash: cryptography.getRandomBytes(48),
			},
			name: 'sidechain1',
			networkID: cryptography.getRandomBytes(32),
			status: CHAIN_ACTIVE,
		};
		partnerChannelAccount = {
			inbox: {
				appendPath: [Buffer.alloc(1), Buffer.alloc(1)],
				root: cryptography.getRandomBytes(38),
				size: 18,
			},
			messageFeeTokenID: { chainID: 1, localID: 0 },
			outbox: {
				appendPath: [Buffer.alloc(1), Buffer.alloc(1)],
				root: cryptography.getRandomBytes(38),
				size: 18,
			},
			partnerChainOutboxRoot: cryptography.getRandomBytes(38),
		};
		// paramCertificate = {
		//     ...defaultCertificateValues,
		// }
		params = {
			activeValidatorsUpdate: sortedActiveValidatorsUpdate,
			certificate: encodedDefaultCertificate,
			inboxUpdate: { ...defaultInboxUpdateValue },
			newCertificateThreshold: defaultNewCertificateThreshold,
			sendingChainID: defaultSendingChainID,
		};
		context = {
			getAPIContext: getAPIContextMock,
			getStore: getStoreMock,
			logger: testing.mocks.loggerMock,
			networkIdentifier,
			params,
			transaction: defaultTransaction as any,
		};
		when(partnerChainStore.getWithSchema)
			.calledWith(defaultSendingChainIDBuffer, chainAccountSchema)
			.mockResolvedValue(partnerChainAccount);

		when(partnerChannelStore.getWithSchema)
			.calledWith(defaultSendingChainIDBuffer, channelSchema)
			.mockResolvedValue(partnerChannelAccount);

		when(getStoreMock)
			.calledWith(defaultTransaction.moduleID, STORE_PREFIX_CHAIN_DATA)
			.mockReturnValueOnce(partnerChainStore);

		when(getStoreMock)
			.calledWith(defaultTransaction.moduleID, STORE_PREFIX_CHANNEL_DATA)
			.mockReturnValueOnce(partnerChannelStore);

		jest
			.spyOn(interopUtils, 'checkInboxUpdateValidity')
			.mockReturnValue({ status: VerifyStatus.OK });

		mainchainCCUUpdateCommand = new MainchainCCUpdateCommand(moduleID, new Map(), new Map());
		jest.spyOn(MainchainInteroperabilityStore.prototype, 'isLive').mockResolvedValue(true);
	});
	describe('verify', () => {
		it('should return error when ccu params validation fails', async () => {
			const { status, error } = await mainchainCCUUpdateCommand.verify({
				...context,
				params: { ...params, sendingChainID: Buffer.alloc(2) } as any,
			});

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain('.sendingChainID');
		});

		it('should return error when chain has terminated status', async () => {
			when(partnerChainStore.getWithSchema)
				.calledWith(defaultSendingChainIDBuffer, chainAccountSchema)
				.mockResolvedValue({ ...partnerChainAccount, status: CHAIN_TERMINATED });

			const { status, error } = await mainchainCCUUpdateCommand.verify(context);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain('Sending partner chain 20 is terminated.');
		});

		it('should return error when chain is active but not live', async () => {
			jest.spyOn(MainchainInteroperabilityStore.prototype, 'isLive').mockResolvedValue(false);
			const { status, error } = await mainchainCCUUpdateCommand.verify(context);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain('Sending partner chain 20 is not live');
		});

		it('should return error checkLivenessRequirementFirstCCU fails', async () => {
			when(partnerChainStore.getWithSchema)
				.calledWith(defaultSendingChainIDBuffer, chainAccountSchema)
				.mockResolvedValue({ ...partnerChainAccount, status: CHAIN_REGISTERED });

			const { status, error } = await mainchainCCUUpdateCommand.verify({
				...context,
				params: { ...params, certificate: EMPTY_BYTES },
			});
			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain(
				`Sending partner chain ${defaultSendingChainID} is in registered status so certificate cannot be empty.`,
			);
		});

		it('should return error checkCertificateValidity fails when certificate height is less than lastCertificateHeight', async () => {
			const encodedDefaultCertificateWithLowerheight = codec.encode(certificateSchema, {
				...defaultCertificateValues,
				height: 9,
			});

			const { status, error } = await mainchainCCUUpdateCommand.verify({
				...context,
				params: { ...params, certificate: encodedDefaultCertificateWithLowerheight },
			});
			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain(
				'Certificate height should be greater than last certificate height.',
			);
		});

		it('should return error checkActiveValidatorsUpdate fails when Validators blsKeys are not unique and lexicographically ordered', async () => {
			const { status, error } = await mainchainCCUUpdateCommand.verify({
				...context,
				params: { ...params, activeValidatorsUpdate },
			});

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain(
				'Validators blsKeys must be unique and lexicographically ordered.',
			);
		});

		it('should return error checkInboxUpdateValidity fails', async () => {
			jest.spyOn(interopUtils, 'checkInboxUpdateValidity').mockReturnValue({
				status: VerifyStatus.FAIL,
				error: new Error(
					'Failed at verifying state root when messageWitness is non-empty and certificate is empty.',
				),
			});

			const { status, error } = await mainchainCCUUpdateCommand.verify(context);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain(
				'Failed at verifying state root when messageWitness is non-empty and certificate is empty.',
			);
		});

		it('should return Verify.OK when all the checks pass', async () => {
			const { status, error } = await mainchainCCUUpdateCommand.verify(context);

			expect(status).toEqual(VerifyStatus.OK);
			expect(error).toBeUndefined();
		});
	});

	describe('execute', () => {
		it('should throw error when checkValidCertificateLiveness() throws error', () => {});

		it('should throw error when checkCertificateTimestampAndSignature() throws error', () => {});
		it('should throw error when checkValidatorsHashWithCertificate() throws error', () => {});
		it('should throw error and calls terminateChainInternal() if CCM decoding fails', () => {});
		it('should throw error when chain.status === CHAIN_REGISTERED and inboxUpdate is non-empty and the first CCM is not a registration CCM', () => {});
		it('should call terminateChainInternal() for a ccm when txParams.sendingChainID !== ccm.deserilized.sendingChainID', () => {});
		it('should call terminateChainInternal() for a ccm when it fails on validateFormat', () => {});
		it('should call forward() when ccm.deserilized.receivingChainID !== MAINCHAIN_ID', () => {});
		it('should call apply() when ccm.deserilized.receivingChainID === MAINCHAIN_ID', () => {});
	});
});
