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
import {
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	MAINCHAIN_ID_BUFFER,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import { SidechainCCSidechainTerminatedCommand } from '../../../../../../src/modules/interoperability/sidechain/cc_commands';
import { SidechainInteroperabilityStore } from '../../../../../../src/modules/interoperability/sidechain/store';
import { sidechainTerminatedCCMParamsSchema } from '../../../../../../src/modules/interoperability/schemas';
import { CCCommandExecuteContext } from '../../../../../../src/modules/interoperability/types';
import { createExecuteCCMsgMethodContext } from '../../../../../../src/testing';
import { SidechainInteroperabilityModule } from '../../../../../../src';
import { NamedRegistry } from '../../../../../../src/modules/named_registry';

describe('SidechainCCSidechainTerminatedCommand', () => {
	const interopMod = new SidechainInteroperabilityModule();

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
	const sampleExecuteContext: CCCommandExecuteContext = createExecuteCCMsgMethodContext({
		ccm,
		chainID,
	});
	const sampleExecuteContextNew: CCCommandExecuteContext = createExecuteCCMsgMethodContext({
		ccm: ccmNew,
		chainID,
	});

	let mainchainInteroperabilityStore: SidechainInteroperabilityStore;
	let ccSidechainTerminatedCommand: SidechainCCSidechainTerminatedCommand;

	beforeEach(() => {
		mainchainInteroperabilityStore = new SidechainInteroperabilityStore(
			interopMod.stores,
			sampleExecuteContext,
			ccMethodsMap,
			new NamedRegistry(),
		);
		mainchainInteroperabilityStore.terminateChainInternal = terminateChainInternalMock;
		mainchainInteroperabilityStore.hasTerminatedStateAccount = hasTerminatedStateAccountMock;
		mainchainInteroperabilityStore.createTerminatedStateAccount = createTerminatedStateAccountMock;

		ccSidechainTerminatedCommand = new SidechainCCSidechainTerminatedCommand(
			interopMod.stores,
			interopMod.events,
			ccMethodsMap,
		);
		(ccSidechainTerminatedCommand as any)['getInteroperabilityStore'] = jest
			.fn()
			.mockReturnValue(mainchainInteroperabilityStore);
	});

	it('should call terminateChainInternal when sendingChainID !== MAINCHAIN_ID', async () => {
		await ccSidechainTerminatedCommand.execute(sampleExecuteContextNew);

		expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		expect(terminateChainInternalMock).toHaveBeenCalledWith(
			ccmNew.sendingChainID,
			expect.objectContaining({
				ccm: ccmNew,
				chainID,
			}),
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
