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
import { SidechainInteroperabilityModule } from '../../../../../../src';
import {
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	EMPTY_BYTES,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import { SidechainCCChannelTerminatedCommand } from '../../../../../../src/modules/interoperability/sidechain/cc_commands';
import { SidechainInteroperabilityStore } from '../../../../../../src/modules/interoperability/sidechain/store';
import { CCCommandExecuteContext } from '../../../../../../src/modules/interoperability/types';
import { NamedRegistry } from '../../../../../../src/modules/named_registry';
import { createExecuteCCMsgMethodContext } from '../../../../../../src/testing';

describe('SidechainCCChannelTerminatedCommand', () => {
	const interopMod = new SidechainInteroperabilityModule();
	const createTerminatedStateAccountMock = jest.fn();

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
	const ccm = {
		nonce: BigInt(0),
		module: MODULE_NAME_INTEROPERABILITY,
		crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
		sendingChainID: utils.intToBuffer(2, 4),
		receivingChainID: utils.intToBuffer(3, 4),
		fee: BigInt(20000),
		status: 0,
		params: EMPTY_BYTES,
	};
	const sampleExecuteContext: CCCommandExecuteContext = createExecuteCCMsgMethodContext({
		ccm,
		chainID,
	});

	const ccChannelTerminatedCommand = new SidechainCCChannelTerminatedCommand(
		interopMod.stores,
		interopMod.events,
		ccMethodsMap,
	);
	const sidechainInteroperabilityStore = new SidechainInteroperabilityStore(
		interopMod.stores,
		sampleExecuteContext,
		ccMethodsMap,
		new NamedRegistry(),
	);
	sidechainInteroperabilityStore.createTerminatedStateAccount = createTerminatedStateAccountMock;
	sidechainInteroperabilityStore.isLive = jest.fn().mockResolvedValue(false);
	(ccChannelTerminatedCommand as any)['getInteroperabilityStore'] = jest
		.fn()
		.mockReturnValue(sidechainInteroperabilityStore);
	const channelOutbox = {
		size: 10,
		root: Buffer.from('01', 'hex'),
	};
	sidechainInteroperabilityStore.getChannel = jest.fn().mockResolvedValue({
		outbox: channelOutbox,
	});

	describe('execute', () => {
		it('should skip if isLive is false ', async () => {
			await ccChannelTerminatedCommand.execute(sampleExecuteContext);
			expect(createTerminatedStateAccountMock).toHaveBeenCalledTimes(0);
		});

		it('should call createTerminatedStateAccount if isLive', async () => {
			sidechainInteroperabilityStore.isLive = jest.fn().mockResolvedValue(true);

			await ccChannelTerminatedCommand.execute(sampleExecuteContext);
			expect(createTerminatedStateAccountMock).toHaveBeenCalledWith(
				sampleExecuteContext,
				ccm.sendingChainID,
			);
		});
	});
});
