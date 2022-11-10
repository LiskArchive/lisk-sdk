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
import { MainchainInteroperabilityModule } from '../../../../../../src';
import {
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	MAINCHAIN_ID_BUFFER,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import { MainchainCCRegistrationCommand } from '../../../../../../src/modules/interoperability/mainchain/cc_commands';
import { MainchainInteroperabilityInternalMethod } from '../../../../../../src/modules/interoperability/mainchain/store';
import { registrationCCMParamsSchema } from '../../../../../../src/modules/interoperability/schemas';
import { ChannelDataStore } from '../../../../../../src/modules/interoperability/stores/channel_data';
import { OwnChainAccountStore } from '../../../../../../src/modules/interoperability/stores/own_chain_account';
import { CrossChainMessageContext } from '../../../../../../src/modules/interoperability/types';
import { NamedRegistry } from '../../../../../../src/modules/named_registry';
import { createCrossChainMessageContext } from '../../../../../../src/testing';

describe('MainchainCCRegistrationCommand', () => {
	const interopMod = new MainchainInteroperabilityModule();

	const terminateChainInternalMock = jest.fn();
	const getChannelMock = {
		get: jest.fn(),
		set: jest.fn(),
	};

	const getOwnChainAccountMock = {
		get: jest.fn(),
		set: jest.fn(),
	};

	const ownChainAccount = {
		name: 'mainchain',
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

	const chainID = utils.intToBuffer(2, 4);

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
		sendingChainID: chainID,
		receivingChainID: MAINCHAIN_ID_BUFFER,
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

	let mainchainInteroperabilityInternalMethod: MainchainInteroperabilityInternalMethod;
	let ccRegistrationCommand: MainchainCCRegistrationCommand;

	beforeEach(() => {
		mainchainInteroperabilityInternalMethod = new MainchainInteroperabilityInternalMethod(
			interopMod.stores,
			new NamedRegistry(),
			sampleExecuteContext,
			ccMethodsMap,
		);
		mainchainInteroperabilityInternalMethod.terminateChainInternal = terminateChainInternalMock;

		interopMod.stores.register(ChannelDataStore, getChannelMock as never);
		interopMod.stores.register(OwnChainAccountStore, getOwnChainAccountMock as never);

		ccRegistrationCommand = new MainchainCCRegistrationCommand(
			interopMod.stores,
			interopMod.events,
			ccMethodsMap,
		);
		(ccRegistrationCommand as any)['getInteroperabilityInternalMethod'] = jest
			.fn()
			.mockReturnValue(mainchainInteroperabilityInternalMethod);
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

		getChannelMock.get.mockResolvedValue(dataWithMoreThanOneInboxSize);

		getOwnChainAccountMock.get.mockResolvedValue(ownChainAccount);

		await ccRegistrationCommand.execute(sampleExecuteContext);

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(
			ccm.sendingChainID,
			expect.objectContaining({
				chainID,
				ccm,
			}),
		);
	});

	it('should call terminateChainInternal when ccm.status !== CCMStatus.OK', async () => {
		// Arrange
		const invalidCCM = {
			nonce: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
			sendingChainID: chainID,
			receivingChainID: MAINCHAIN_ID_BUFFER,
			fee: BigInt(20000),
			status: 1,
			params: encodedRegistrationParams,
		};

		getOwnChainAccountMock.get.mockResolvedValue(ownChainAccount);

		await ccRegistrationCommand.execute({ ...sampleExecuteContext, ccm: invalidCCM });

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(
			ccm.sendingChainID,
			expect.objectContaining({
				chainID,
				ccm: invalidCCM,
			}),
		);
	});

	it('should call terminateChainInternal when ownChainAccount.id !== ccm.receivingChainID', async () => {
		// Arrange
		getChannelMock.get.mockResolvedValue(channelData);

		getOwnChainAccountMock.get.mockResolvedValue({
			...ownChainAccount,
			chainID: utils.intToBuffer(3, 4),
		});

		await ccRegistrationCommand.execute(sampleExecuteContext);

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(
			ccm.sendingChainID,
			expect.objectContaining({
				chainID,
				ccm,
			}),
		);
	});

	it('should call terminateChainInternal when ownChainAccount.name !== decodedParams.name', async () => {
		// Arrange
		getChannelMock.get.mockResolvedValue(channelData);

		getOwnChainAccountMock.get.mockResolvedValue({ ...ownChainAccount, name: 'chain1' });

		await ccRegistrationCommand.execute(sampleExecuteContext);

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(
			ccm.sendingChainID,
			expect.objectContaining({
				chainID,
				ccm,
			}),
		);
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
		getChannelMock.get.mockResolvedValue(incorrectChainIDChannelData);

		getOwnChainAccountMock.get.mockResolvedValue(ownChainAccount);

		await ccRegistrationCommand.execute(sampleExecuteContext);

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(
			ccm.sendingChainID,
			expect.objectContaining({
				chainID,
				ccm,
			}),
		);
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
		getChannelMock.get.mockResolvedValue(incorrectChainIDChannelData);

		getOwnChainAccountMock.get.mockResolvedValue(ownChainAccount);

		await ccRegistrationCommand.execute(sampleExecuteContext);

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(
			ccm.sendingChainID,
			expect.objectContaining({
				chainID,
				ccm,
			}),
		);
	});

	it('should call terminateChainInternal when decodedParams.chainID !== ownChainAccount.chainID', async () => {
		// Arrange
		getChannelMock.get.mockResolvedValue(channelData);

		getOwnChainAccountMock.get.mockResolvedValue(ownChainAccount);

		const differentNetworkID = utils.getRandomBytes(32);
		await ccRegistrationCommand.execute({
			...sampleExecuteContext,
			chainID: differentNetworkID,
		});

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(
			ccm.sendingChainID,
			expect.objectContaining({
				chainID: differentNetworkID,
				ccm,
			}),
		);
	});

	it('should call terminateChainInternal when ccm.nonce !== 0', async () => {
		// Arrange
		const invalidCCM = {
			nonce: BigInt(1), // nonce not equal to 0
			module: MODULE_NAME_INTEROPERABILITY,
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
			sendingChainID: chainID,
			receivingChainID: MAINCHAIN_ID_BUFFER,
			fee: BigInt(20000),
			status: 0,
			params: encodedRegistrationParams,
		};
		getChannelMock.get.mockResolvedValue(channelData);

		getOwnChainAccountMock.get.mockResolvedValue(ownChainAccount);

		await ccRegistrationCommand.execute({ ...sampleExecuteContext, ccm: invalidCCM });

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(
			ccm.sendingChainID,
			expect.objectContaining({
				chainID,
				ccm: invalidCCM,
			}),
		);
	});

	it('should execute successfully', async () => {
		// Arrange
		getChannelMock.get.mockResolvedValue(channelData);

		getOwnChainAccountMock.get.mockResolvedValue(ownChainAccount);

		await ccRegistrationCommand.execute(sampleExecuteContext);

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(0);
	});
});
