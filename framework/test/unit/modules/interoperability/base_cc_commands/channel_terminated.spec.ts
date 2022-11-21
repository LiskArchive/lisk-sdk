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
import { MainchainInteroperabilityModule } from '../../../../../src';
import {
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	EMPTY_BYTES,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../src/modules/interoperability/constants';
import { MainchainCCChannelTerminatedCommand } from '../../../../../src/modules/interoperability/mainchain/cc_commands';
import { createCrossChainMessageContext } from '../../../../../src/testing';

describe('BaseCCChannelTerminatedCommand', () => {
	const interopMod = new MainchainInteroperabilityModule();
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
	const sampleExecuteContext = {
		...createCrossChainMessageContext({
			ccm,
			chainID,
		}),
		params: undefined,
	};

	const ccChannelTerminatedCommand = new MainchainCCChannelTerminatedCommand(
		interopMod.stores,
		interopMod.events,
		ccMethodsMap,
		interopMod['internalMethod'],
	);
	interopMod['internalMethod'].createTerminatedStateAccount = createTerminatedStateAccountMock;

	describe('execute', () => {
		it('should skip if isLive is false ', async () => {
			interopMod['internalMethod'].isLive = jest.fn().mockResolvedValue(false);

			await ccChannelTerminatedCommand.execute(sampleExecuteContext);
			expect(createTerminatedStateAccountMock).toHaveBeenCalledTimes(0);
		});

		it('should call createTerminatedStateAccount if isLive', async () => {
			interopMod['internalMethod'].isLive = jest.fn().mockResolvedValue(true);

			await ccChannelTerminatedCommand.execute(sampleExecuteContext);
			expect(createTerminatedStateAccountMock).toHaveBeenCalledWith(
				sampleExecuteContext,
				ccm.sendingChainID,
			);
		});
	});
});
