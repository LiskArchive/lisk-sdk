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
import { ChainStatus, MainchainInteroperabilityModule } from '../../../../../src';
import {
	CHAIN_ID_LENGTH,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	EMPTY_BYTES,
	EMPTY_HASH,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../src/modules/interoperability/constants';
import { MainchainCCChannelTerminatedCommand } from '../../../../../src/modules/interoperability/mainchain/cc_commands';
import {
	createCrossChainMessageContext,
	InMemoryPrefixedStateDB,
} from '../../../../../src/testing';
import { TerminatedStateStore } from '../../../../../src/modules/interoperability/stores/terminated_state';
import { createStoreGetter } from '../../../../../src/testing/utils';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { CCCommandExecuteContext } from '../../../../../src/modules/interoperability/types';

describe('BaseCCChannelTerminatedCommand', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const createTerminatedStateAccountMock = jest.fn();

	let sampleExecuteContext: CCCommandExecuteContext<void>;
	let stateStore: PrefixedStateReadWriter;
	let terminatedStateSubstore: TerminatedStateStore;

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

	const ccChannelTerminatedCommand = new MainchainCCChannelTerminatedCommand(
		interopMod.stores,
		interopMod.events,
		ccMethodsMap,
		interopMod['internalMethod'],
	);
	interopMod['internalMethod'].createTerminatedStateAccount = createTerminatedStateAccountMock;

	const sidechainChainAccount = {
		name: 'sidechain1',
		chainID: Buffer.alloc(CHAIN_ID_LENGTH),
		lastCertificate: {
			height: 10,
			stateRoot: utils.getRandomBytes(32),
			timestamp: 100,
			validatorsHash: utils.getRandomBytes(32),
		},
		status: ChainStatus.TERMINATED,
	};

	beforeEach(() => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		sampleExecuteContext = {
			...createCrossChainMessageContext({
				ccm,
				chainID,
				stateStore,
			}),
			params: undefined,
		};
	});

	describe('execute', () => {
		it('should skip if terminatedStateAccount exists', async () => {
			terminatedStateSubstore = interopMod.stores.get(TerminatedStateStore);
			await terminatedStateSubstore.set(
				createStoreGetter(stateStore),
				sampleExecuteContext.ccm.sendingChainID,
				{
					stateRoot: sidechainChainAccount.lastCertificate.stateRoot,
					mainchainStateRoot: EMPTY_HASH,
					initialized: true,
				},
			);

			await ccChannelTerminatedCommand.execute(sampleExecuteContext);
			expect(createTerminatedStateAccountMock).toHaveBeenCalledTimes(0);
		});

		it('should call createTerminatedStateAccount if terminatedStateAccount do not exists', async () => {
			await ccChannelTerminatedCommand.execute(sampleExecuteContext);
			expect(createTerminatedStateAccountMock).toHaveBeenCalledWith(
				sampleExecuteContext,
				ccm.sendingChainID,
			);
		});
	});
});
