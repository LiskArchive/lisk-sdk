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

import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { SidechainCCRegistrationCommand } from '../../../../../../src/modules/interoperability/sidechain/cc_commands/registration';
import { registrationCCMParamsSchema } from '../../../../../../src/modules/interoperability/schemas';
import { SidechainInteroperabilityInternalMethod } from '../../../../../../src/modules/interoperability/sidechain/internal_method';
import { CrossChainMessageContext } from '../../../../../../src/modules/interoperability/types';
import { createCrossChainMessageContext } from '../../../../../../src/testing';
import { SidechainInteroperabilityModule } from '../../../../../../src';
import {
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import { NamedRegistry } from '../../../../../../src/modules/named_registry';
import { ChannelDataStore } from '../../../../../../src/modules/interoperability/stores/channel_data';
import { OwnChainAccountStore } from '../../../../../../src/modules/interoperability/stores/own_chain_account';

describe('SidechainCCRegistrationCommand', () => {
	const interopMod = new SidechainInteroperabilityModule();

	const terminateChainInternalMock = jest.fn();
	const channelStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};
	const ownChainAccountStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};

	const ownChainAccount = {
		name: 'sidechain',
		chainID: utils.intToBuffer(1, 4),
		nonce: BigInt(0),
	};

	const ccMethodMod1 = {
		beforeSendCCM: jest.fn(),
		beforeApplyCCM: jest.fn(),
	};

	const ccMethodMod2 = {
		beforeSendCCM: jest.fn(),
		beforeApplyCCM: jest.fn(),
	};

	const ccMethodsMap = new Map();
	ccMethodsMap.set(1, ccMethodMod1);
	ccMethodsMap.set(2, ccMethodMod2);

	const chainID = utils.getRandomBytes(32);

	const ccmRegistrationParams = {
		chainID,
		name: ownChainAccount.name,
		messageFeeTokenID: Buffer.from('0000000000000011', 'hex'),
	};

	const encodedRegistrationParams = codec.encode(
		registrationCCMParamsSchema,
		ccmRegistrationParams,
	);

	const ccm = {
		nonce: BigInt(0),
		module: MODULE_NAME_INTEROPERABILITY,
		crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
		sendingChainID: utils.intToBuffer(2, 4),
		receivingChainID: utils.intToBuffer(1, 4),
		fee: BigInt(20000),
		status: 0,
		params: encodedRegistrationParams,
	};
	const channelData = {
		inbox: {
			appendPath: [],
			root: Buffer.alloc(0),
			size: 1,
		},
		messageFeeTokenID: Buffer.from('0000000000000011', 'hex'),
		outbox: {
			appendPath: [],
			root: Buffer.alloc(0),
			size: 1,
		},
		partnerChainOutboxRoot: Buffer.alloc(0),
	};
	const sampleExecuteContext: CrossChainMessageContext = createCrossChainMessageContext({
		ccm,
		chainID,
	});

	let sidechainInteroperabilityInternalMethod: SidechainInteroperabilityInternalMethod;
	let ccRegistrationCommand: SidechainCCRegistrationCommand;

	beforeEach(() => {
		sidechainInteroperabilityInternalMethod = new SidechainInteroperabilityInternalMethod(
			interopMod.stores,
			new NamedRegistry(),
			ccMethodsMap,
		);
		sidechainInteroperabilityInternalMethod.terminateChainInternal = terminateChainInternalMock;

		interopMod.stores.register(ChannelDataStore, channelStoreMock as never);
		interopMod.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);

		ccRegistrationCommand = new SidechainCCRegistrationCommand(
			interopMod.stores,
			interopMod.events,
			ccMethodsMap,
		);
		(ccRegistrationCommand as any)['getInteroperabilityInternalMethod'] = jest
			.fn()
			.mockReturnValue(sidechainInteroperabilityInternalMethod);
	});

	it('should call terminateChainInternal when sendingChainChannelAccount.inbox.size !== 1', async () => {
		// Arrange
		const dataWithMoreThanOneInboxSize = {
			inbox: {
				appendPath: [],
				root: Buffer.alloc(0),
				size: 2,
			},
			messageFeeTokenID: Buffer.from('0000000000000011', 'hex'),
			outbox: {
				appendPath: [],
				root: Buffer.alloc(0),
				size: 1,
			},
			partnerChainOutboxRoot: Buffer.alloc(0),
		};

		channelStoreMock.get.mockResolvedValue(dataWithMoreThanOneInboxSize);

		ownChainAccountStoreMock.get.mockResolvedValue(ownChainAccount);

		await ccRegistrationCommand.execute(sampleExecuteContext);

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(expect.anything(), ccm.sendingChainID);
	});

	it('should call terminateChainInternal when ccm.status !== CCMStatus.OK', async () => {
		// Arrange
		const invalidCCM = {
			nonce: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
			sendingChainID: utils.intToBuffer(2, 4),
			receivingChainID: utils.intToBuffer(1, 4),
			fee: BigInt(20000),
			status: 1,
			params: encodedRegistrationParams,
		};

		ownChainAccountStoreMock.get.mockResolvedValue(ownChainAccount);

		await ccRegistrationCommand.execute({ ...sampleExecuteContext, ccm: invalidCCM });

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(expect.anything(), ccm.sendingChainID);
	});

	it('should call terminateChainInternal when ownChainAccount.chainID !== ccm.receivingChainID', async () => {
		// Arrange
		channelStoreMock.get.mockResolvedValue(channelData);

		ownChainAccountStoreMock.get.mockResolvedValue({
			...ownChainAccount,
			chainID: utils.intToBuffer(3, 4),
		});

		await ccRegistrationCommand.execute(sampleExecuteContext);

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(expect.anything(), ccm.sendingChainID);
	});

	it('should call terminateChainInternal when ownChainAccount.name !== decodedParams.name', async () => {
		// Arrange
		channelStoreMock.get.mockResolvedValue(channelData);

		ownChainAccountStoreMock.get.mockResolvedValue({ ...ownChainAccount, name: 'chain1' });

		await ccRegistrationCommand.execute(sampleExecuteContext);

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(expect.anything(), ccm.sendingChainID);
	});

	it('should call terminateChainInternal when sendingChainChannelAccount.chainID !== decodedParams.chainID', async () => {
		// Arrange
		const incorrectChainIDChannelData = {
			inbox: {
				appendPath: [],
				root: Buffer.alloc(0),
				size: 2,
			},
			messageFeeTokenID: Buffer.from('0000000000000011', 'hex'),
			outbox: {
				appendPath: [],
				root: Buffer.alloc(0),
				size: 1,
			},
			partnerChainOutboxRoot: Buffer.alloc(0),
		};
		channelStoreMock.get.mockResolvedValue(incorrectChainIDChannelData);

		ownChainAccountStoreMock.get.mockResolvedValue(ownChainAccount);

		await ccRegistrationCommand.execute(sampleExecuteContext);

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(expect.anything(), ccm.sendingChainID);
	});

	it('should call terminateChainInternal when sendingChainChannelAccount.localID !== decodedParams.localID', async () => {
		// Arrange
		const incorrectChainIDChannelData = {
			inbox: {
				appendPath: [],
				root: Buffer.alloc(0),
				size: 2,
			},
			messageFeeTokenID: Buffer.from('0000000000000011', 'hex'),
			outbox: {
				appendPath: [],
				root: Buffer.alloc(0),
				size: 1,
			},
			partnerChainOutboxRoot: Buffer.alloc(0),
		};
		channelStoreMock.get.mockResolvedValue(incorrectChainIDChannelData);

		ownChainAccountStoreMock.get.mockResolvedValue(ownChainAccount);

		await ccRegistrationCommand.execute(sampleExecuteContext);

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(expect.anything(), ccm.sendingChainID);
	});

	it('should call terminateChainInternal when decodedParams.chainID !== ownChainAccount.chainID', async () => {
		// Arrange
		channelStoreMock.get.mockResolvedValue(channelData);

		ownChainAccountStoreMock.get.mockResolvedValue(ownChainAccount);

		const differentChainID = utils.getRandomBytes(32);
		await ccRegistrationCommand.execute({
			...sampleExecuteContext,
			chainID: differentChainID,
		});

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(expect.anything(), ccm.sendingChainID);
	});

	it('should execute successfully', async () => {
		// Arrange
		channelStoreMock.get.mockResolvedValue(channelData);

		ownChainAccountStoreMock.get.mockResolvedValue(ownChainAccount);

		await ccRegistrationCommand.execute(sampleExecuteContext);

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(0);
	});
});
