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
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import { SidechainCCChannelTerminatedCommand } from '../../../../../../src/modules/interoperability/sidechain/cc_commands/channel_terminated';
import { SidechainInteroperabilityStore } from '../../../../../../src/modules/interoperability/sidechain/store';
import { CCCommandExecuteContext } from '../../../../../../src/modules/interoperability/types';
import { createExecuteCCMsgAPIContext } from '../../../../../../src/testing';

describe('SidechainCCChannelTerminatedCommand', () => {
	const interopMod = new SidechainInteroperabilityModule();
	const createTerminatedStateAccountMock = jest.fn();

	const ccAPIMod1 = {
		beforeSendCCM: jest.fn(),
		beforeApplyCCM: jest.fn(),
	};
	const ccAPIMod2 = {
		beforeSendCCM: jest.fn(),
		beforeApplyCCM: jest.fn(),
	};
	const ccAPIsMap = new Map();
	ccAPIsMap.set(1, ccAPIMod1);
	ccAPIsMap.set(2, ccAPIMod2);
	const networkIdentifier = utils.getRandomBytes(32);
	const ccm = {
		nonce: BigInt(0),
		module: MODULE_NAME_INTEROPERABILITY,
		crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
		sendingChainID: utils.intToBuffer(2, 4),
		receivingChainID: utils.intToBuffer(3, 4),
		fee: BigInt(20000),
		status: 0,
		params: Buffer.alloc(0),
	};
	const sampleExecuteContext: CCCommandExecuteContext = createExecuteCCMsgAPIContext({
		ccm,
		networkIdentifier,
	});

	const ccChannelTerminatedCommand = new SidechainCCChannelTerminatedCommand(
		interopMod.stores,
		interopMod.events,
		ccAPIsMap,
	);
	const mainchainInteroperabilityStore = new SidechainInteroperabilityStore(
		interopMod.stores,
		sampleExecuteContext,
		ccAPIsMap,
	);
	mainchainInteroperabilityStore.createTerminatedStateAccount = createTerminatedStateAccountMock;
	(ccChannelTerminatedCommand as any)['getInteroperabilityStore'] = jest
		.fn()
		.mockReturnValue(mainchainInteroperabilityStore);

	describe('execute', () => {
		it('should call validators API registerValidatorKeys', async () => {
			await ccChannelTerminatedCommand.execute(sampleExecuteContext);

			expect(createTerminatedStateAccountMock).toHaveBeenCalledWith(ccm.sendingChainID);
		});
	});
});
