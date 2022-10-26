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
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import { MainchainCCChannelTerminatedCommand } from '../../../../../../src/modules/interoperability/mainchain/cc_commands/channel_terminated';
import { MainchainInteroperabilityStore } from '../../../../../../src/modules/interoperability/mainchain/store';
import { CCCommandExecuteContext } from '../../../../../../src/modules/interoperability/types';
import { NamedRegistry } from '../../../../../../src/modules/named_registry';
import { createExecuteCCMsgMethodContext } from '../../../../../../src/testing';
import { channelTerminatedCCMParamsSchema } from '../../../../../../dist-node/modules/interoperability/schemas';

describe('MainchainCCChannelTerminatedCommand', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const createTerminatedStateAccountMock = jest.fn();
	const createTerminatedOutboxAccountMock = jest.fn();

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
	const ccmParams = {
		stateRoot: Buffer.from('10000000', 'hex'),
		inboxSize: 1,
	};
	const ccm = {
		nonce: BigInt(0),
		module: MODULE_NAME_INTEROPERABILITY,
		crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
		sendingChainID: utils.intToBuffer(2, 4),
		receivingChainID: utils.intToBuffer(3, 4),
		fee: BigInt(20000),
		status: 0,
		params: codec.encode(channelTerminatedCCMParamsSchema, ccmParams),
	};
	const sampleExecuteContext: CCCommandExecuteContext = createExecuteCCMsgMethodContext({
		ccm,
		chainID,
	});

	const ccChannelTerminatedCommand = new MainchainCCChannelTerminatedCommand(
		interopMod.stores,
		interopMod.events,
		ccMethodsMap,
	);
	const mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
		interopMod.stores,
		sampleExecuteContext,
		ccMethodsMap,
		new NamedRegistry(),
	);
	mainchainInteroperabilityStore.createTerminatedStateAccount = createTerminatedStateAccountMock;
	mainchainInteroperabilityStore.createTerminatedOutboxAccount = createTerminatedOutboxAccountMock;
	mainchainInteroperabilityStore.isLive = jest.fn().mockResolvedValue(false);
	(ccChannelTerminatedCommand as any)['getInteroperabilityStore'] = jest
		.fn()
		.mockReturnValue(mainchainInteroperabilityStore);
	const channelOutbox = {
		size: 10,
		root: Buffer.from('01', 'hex'),
	};
	mainchainInteroperabilityStore.getChannel = jest.fn().mockResolvedValue({
		outbox: channelOutbox,
	});

	describe('execute', () => {
		it('should skip if isLive is false ', async () => {
			await ccChannelTerminatedCommand.execute(sampleExecuteContext);
			expect(createTerminatedStateAccountMock).toHaveBeenCalledTimes(0);
			expect(createTerminatedOutboxAccountMock).toHaveBeenCalledTimes(0);
		});

		it('should call createTerminatedStateAccount and createTerminatedOutboxAccount if isLive', async () => {
			mainchainInteroperabilityStore.isLive = jest.fn().mockResolvedValue(true);

			await ccChannelTerminatedCommand.execute(sampleExecuteContext);
			expect(createTerminatedStateAccountMock).toHaveBeenCalledWith(
				ccm.sendingChainID,
				ccmParams.stateRoot,
			);
			expect(createTerminatedOutboxAccountMock).toHaveBeenCalledWith(
				ccm.sendingChainID,
				channelOutbox.root,
				channelOutbox.size,
				ccmParams.inboxSize,
			);
		});
	});
});
