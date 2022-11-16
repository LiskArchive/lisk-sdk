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
import { MainchainCCSidechainTerminatedCommand } from '../../../../../../src/modules/interoperability/mainchain/cc_commands';
import { sidechainTerminatedCCMParamsSchema } from '../../../../../../src/modules/interoperability/schemas';
import { TerminatedStateStore } from '../../../../../../src/modules/interoperability/stores/terminated_state';
import { CrossChainMessageContext } from '../../../../../../src/modules/interoperability/types';
import { createCrossChainMessageContext } from '../../../../../../src/testing';

describe('MainchainCCSidechainTerminatedCommand', () => {
	const interopMod = new MainchainInteroperabilityModule();

	const terminateChainInternalMock = jest.fn();
	const hasTerminatedStateAccountMock = jest.fn();
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

	const ccmSidechainTerminatedParams = {
		chainID: utils.intToBuffer(5, 4),
		stateRoot: utils.getRandomBytes(32),
	};

	const encodedSidechainTerminatedParams = codec.encode(
		sidechainTerminatedCCMParamsSchema,
		ccmSidechainTerminatedParams,
	);

	const ccm = {
		nonce: BigInt(0),
		module: MODULE_NAME_INTEROPERABILITY,
		crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
		sendingChainID: MAINCHAIN_ID_BUFFER,
		receivingChainID: utils.intToBuffer(1, 4),
		fee: BigInt(20000),
		status: 0,
		params: encodedSidechainTerminatedParams,
	};
	const ccmNew = {
		...ccm,
		sendingChainID: utils.intToBuffer(2, 4),
	};
	const sampleExecuteContext: CrossChainMessageContext = createCrossChainMessageContext({
		ccm,
		chainID,
	});
	const sampleExecuteContextNew: CrossChainMessageContext = createCrossChainMessageContext({
		ccm: ccmNew,
		chainID,
	});

	let ccSidechainTerminatedCommand: MainchainCCSidechainTerminatedCommand;

	beforeEach(() => {
		interopMod['internalMethod'].terminateChainInternal = terminateChainInternalMock;

		interopMod.stores.get(TerminatedStateStore).has = hasTerminatedStateAccountMock;
		interopMod['internalMethod'].createTerminatedStateAccount = createTerminatedStateAccountMock;

		ccSidechainTerminatedCommand = new MainchainCCSidechainTerminatedCommand(
			interopMod.stores,
			interopMod.events,
			ccMethodsMap,
			interopMod['internalMethod'],
		);
	});

	it('should call terminateChainInternal when sendingChainID !== MAINCHAIN_ID', async () => {
		await ccSidechainTerminatedCommand.execute(sampleExecuteContextNew);

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(
			expect.anything(),
			ccmNew.sendingChainID,
		);
	});

	it('should return without creating a entry for the chainID in the terminated account substore when entry already exists and sendingChainID === MAINCHAIN_ID', async () => {
		hasTerminatedStateAccountMock.mockResolvedValueOnce(true);
		await ccSidechainTerminatedCommand.execute(sampleExecuteContext);

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(0);
		expect(createTerminatedStateAccountMock).toHaveBeenCalledTimes(0);
	});

	it('should create an entry for the chainID in the terminated account substore when an entry does not exist and sendingChainID === MAINCHAIN_ID', async () => {
		hasTerminatedStateAccountMock.mockResolvedValueOnce(false);
		await ccSidechainTerminatedCommand.execute(sampleExecuteContext);

		expect(createTerminatedStateAccountMock).toHaveBeenCalledTimes(1);
		expect(createTerminatedStateAccountMock).toHaveBeenCalledWith(
			sampleExecuteContext,
			ccmSidechainTerminatedParams.chainID,
			ccmSidechainTerminatedParams.stateRoot,
		);
	});
});
