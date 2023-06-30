/*
 * Copyright © 2023 Lisk Foundation
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
import {
	SidechainInteroperabilityMethod,
	SidechainInteroperabilityModule,
	getMainchainID,
} from '../../../../../src';
import { createTransientMethodContext } from '../../../../../src/testing';
import { EventQueue, MethodContext } from '../../../../../src/state_machine';
import {
	ChainAccount,
	ChainAccountStore,
	ChainStatus,
} from '../../../../../src/modules/interoperability/stores/chain_account';
import { OwnChainAccountStore } from '../../../../../src/modules/interoperability/stores/own_chain_account';
import { TerminatedStateStore } from '../../../../../src/modules/interoperability/stores/terminated_state';

describe('Sidechain Method', () => {
	const interopMod = new SidechainInteroperabilityModule();
	const chainID = utils.intToBuffer(1, 4);
	const mainchainID = getMainchainID(chainID);
	const chainAccountStoreMock = {
		get: jest.fn(),
		has: jest.fn(),
	};
	const ownchainAccountStoreMock = {
		get: jest.fn(),
	};
	const terminatedStateStoreMock = {
		has: jest.fn(),
	};
	const interoperableCCMethods = new Map();
	const defaultEventQueue = new EventQueue(0, [], [utils.hash(utils.getRandomBytes(32))]);
	let sidechainInteroperabilityMethod: SidechainInteroperabilityMethod;
	let methodContext: MethodContext;
	let chainAccount: ChainAccount;

	beforeEach(() => {
		methodContext = createTransientMethodContext({ eventQueue: defaultEventQueue });
		interopMod.stores.register(ChainAccountStore, chainAccountStoreMock as never);
		interopMod.stores.register(OwnChainAccountStore, ownchainAccountStoreMock as never);
		interopMod.stores.register(TerminatedStateStore, terminatedStateStoreMock as never);
		sidechainInteroperabilityMethod = new SidechainInteroperabilityMethod(
			interopMod.stores,
			interopMod.events,
			interoperableCCMethods,
			interopMod['internalMethod'],
		);
		chainAccount = {
			name: 'chain',
			lastCertificate: {} as never,
			status: ChainStatus.ACTIVE,
		};
		ownchainAccountStoreMock.get.mockResolvedValue({ chainID: utils.intToBuffer(5, 4) });
	});

	describe('isChannelActive', () => {
		it('should return false when own chain', async () => {
			ownchainAccountStoreMock.get.mockResolvedValue({ chainID });
			const result = await sidechainInteroperabilityMethod.isChannelActive(methodContext, chainID);

			expect(result).toBeFalse();
		});

		it('should return true if chain status is active', async () => {
			chainAccountStoreMock.has.mockResolvedValue(true);
			chainAccountStoreMock.get.mockResolvedValue(chainAccount);
			const result = await sidechainInteroperabilityMethod.isChannelActive(methodContext, chainID);

			expect(result).toBeTrue();
		});

		it('should return false if mainchain account does not exist', async () => {
			// On first call returns false (for chain ID) and second call returns false (mainchainID)
			chainAccountStoreMock.has.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
			const result = await sidechainInteroperabilityMethod.isChannelActive(methodContext, chainID);

			expect(result).toBeFalse();
		});

		it('should return false if mainchain is not active ', async () => {
			// On first call returns false (for chain ID) and second call returns true (mainchainID)
			chainAccountStoreMock.has.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

			chainAccountStoreMock.get.mockResolvedValue({
				chainID: mainchainID,
				status: ChainStatus.REGISTERED,
			});
			const result = await sidechainInteroperabilityMethod.isChannelActive(methodContext, chainID);

			expect(result).toBeFalse();
		});

		it('should return false if chain has terminated state', async () => {
			// On first call returns false (for chain ID) and second call returns true (mainchainID)
			chainAccountStoreMock.has.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

			chainAccountStoreMock.get.mockResolvedValue({
				chainID: mainchainID,
				status: ChainStatus.ACTIVE,
			});
			terminatedStateStoreMock.has.mockResolvedValue(true);
			const result = await sidechainInteroperabilityMethod.isChannelActive(methodContext, chainID);

			expect(result).toBeFalse();
		});

		it('should return true if chain account does not exist, mainchain account exists and is active and terminated state does not exist', async () => {
			// On first call returns false (for chain ID) and second call returns true (mainchainID)
			chainAccountStoreMock.has.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

			chainAccountStoreMock.get.mockResolvedValue({
				chainID: mainchainID,
				status: ChainStatus.ACTIVE,
			});

			terminatedStateStoreMock.has.mockResolvedValue(false);
			const result = await sidechainInteroperabilityMethod.isChannelActive(methodContext, chainID);

			expect(result).toBeTrue();
		});
	});
});
