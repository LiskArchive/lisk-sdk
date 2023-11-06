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
	MainchainInteroperabilityMethod,
	MainchainInteroperabilityModule,
} from '../../../../../src';
import { createTransientMethodContext } from '../../../../../src/testing';
import { EventQueue, MethodContext } from '../../../../../src/state_machine';
import {
	ChainAccount,
	ChainAccountStore,
	ChainStatus,
} from '../../../../../src/modules/interoperability/stores/chain_account';
import { OwnChainAccountStore } from '../../../../../src/modules/interoperability/stores/own_chain_account';

describe('Mainchain Method', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const chainID = utils.intToBuffer(1, 4);
	const chainAccountStoreMock = {
		get: jest.fn(),
		has: jest.fn(),
	};
	const ownchainAccountStoreMock = {
		get: jest.fn(),
	};
	const interoperableCCMethods = new Map();
	const defaultEventQueue = new EventQueue(0, [], [utils.hash(utils.getRandomBytes(32))]);
	const timestamp = Date.now();
	let mainchainInteroperabilityMethod: MainchainInteroperabilityMethod;
	let methodContext: MethodContext;
	let chainAccount: ChainAccount;

	beforeEach(() => {
		methodContext = createTransientMethodContext({ eventQueue: defaultEventQueue });
		interopMod.stores.register(ChainAccountStore, chainAccountStoreMock as never);
		interopMod.stores.register(OwnChainAccountStore, ownchainAccountStoreMock as never);
		mainchainInteroperabilityMethod = new MainchainInteroperabilityMethod(
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
		chainAccountStoreMock.get.mockResolvedValue(chainAccount);
		jest.spyOn(interopMod['internalMethod'], 'isLive').mockResolvedValue(true);
	});

	describe('isChannelActive', () => {
		it('should return false when own chain', async () => {
			ownchainAccountStoreMock.get.mockResolvedValue({ chainID });
			const result = await mainchainInteroperabilityMethod.isChannelActive(
				methodContext,
				chainID,
				timestamp,
			);

			expect(result).toBeFalse();
		});

		it('should return false if chain is not live and chain status is active', async () => {
			jest.spyOn(interopMod['internalMethod'], 'isLive').mockResolvedValue(false);
			const result = await mainchainInteroperabilityMethod.isChannelActive(
				methodContext,
				chainID,
				timestamp,
			);

			expect(result).toBeFalse();
		});

		it('should return false if chain is live and chain status is not active', async () => {
			chainAccountStoreMock.get.mockResolvedValue({
				...chainAccount,
				status: ChainStatus.TERMINATED,
			});
			const result = await mainchainInteroperabilityMethod.isChannelActive(
				methodContext,
				chainID,
				timestamp,
			);

			expect(result).toBeFalse();
		});

		it('should return true if chain is live and chain status is active', async () => {
			chainAccountStoreMock.get.mockResolvedValue({
				...chainAccount,
				status: ChainStatus.ACTIVE,
			});
			const result = await mainchainInteroperabilityMethod.isChannelActive(
				methodContext,
				chainID,
				timestamp,
			);

			expect(result).toBeTrue();
		});
	});
});
