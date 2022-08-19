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
import { SidechainInteroperabilityModule } from '../../../../../src';
import { SidechainInteroperabilityAPI } from '../../../../../src/modules/interoperability/sidechain/api';
import { SidechainInteroperabilityStore } from '../../../../../src/modules/interoperability/sidechain/store';
import { APIContext } from '../../../../../src/state_machine';

describe('Sidechain API', () => {
	const interopMod = new SidechainInteroperabilityModule();

	const chainID = utils.intToBuffer(1, 4);
	const interoperableCCAPIs = new Map();

	let apiContext: APIContext;
	let sidechainInteroperabilityAPI: SidechainInteroperabilityAPI;
	let sidechainInteroperabilityStore: SidechainInteroperabilityStore;

	beforeEach(() => {
		sidechainInteroperabilityAPI = new SidechainInteroperabilityAPI(
			interopMod.stores,
			interopMod.events,
			interoperableCCAPIs,
		);
		sidechainInteroperabilityStore = new SidechainInteroperabilityStore(
			interopMod.stores,
			apiContext,
			interoperableCCAPIs,
		);
		jest
			.spyOn(sidechainInteroperabilityAPI as any, 'getInteroperabilityStore')
			.mockReturnValue(sidechainInteroperabilityStore);
		jest.spyOn(sidechainInteroperabilityStore, 'getChainAccount').mockResolvedValue({} as never);
		jest.spyOn(sidechainInteroperabilityStore, 'getChannel').mockResolvedValue({} as never);
		jest.spyOn(sidechainInteroperabilityStore, 'getOwnChainAccount').mockResolvedValue({} as never);
		jest
			.spyOn(sidechainInteroperabilityStore, 'getTerminatedStateAccount')
			.mockResolvedValue({} as never);
		jest
			.spyOn(sidechainInteroperabilityStore, 'getTerminatedOutboxAccount')
			.mockResolvedValue({} as never);
	});

	describe('getChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityAPI.getChainAccount(apiContext, chainID);

			expect(sidechainInteroperabilityAPI['getInteroperabilityStore']).toHaveBeenCalledWith(
				apiContext,
			);
		});

		it('should call getChainAccount', async () => {
			await sidechainInteroperabilityAPI.getChainAccount(apiContext, chainID);

			expect(sidechainInteroperabilityStore.getChainAccount).toHaveBeenCalledWith(chainID);
		});
	});

	describe('getChannel', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityAPI.getChannel(apiContext, chainID);

			expect(sidechainInteroperabilityAPI['getInteroperabilityStore']).toHaveBeenCalledWith(
				apiContext,
			);
		});

		it('should call getChannel', async () => {
			await sidechainInteroperabilityAPI.getChannel(apiContext, chainID);

			expect(sidechainInteroperabilityStore.getChannel).toHaveBeenCalledWith(chainID);
		});
	});

	describe('getOwnChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityAPI.getOwnChainAccount(apiContext);

			expect(sidechainInteroperabilityAPI['getInteroperabilityStore']).toHaveBeenCalledWith(
				apiContext,
			);
		});

		it('should call getOwnChainAccount', async () => {
			await sidechainInteroperabilityAPI.getOwnChainAccount(apiContext);

			expect(sidechainInteroperabilityStore.getOwnChainAccount).toHaveBeenCalled();
		});
	});

	describe('getTerminatedStateAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityAPI.getTerminatedStateAccount(apiContext, chainID);

			expect(sidechainInteroperabilityAPI['getInteroperabilityStore']).toHaveBeenCalledWith(
				apiContext,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			await sidechainInteroperabilityAPI.getTerminatedStateAccount(apiContext, chainID);

			expect(sidechainInteroperabilityStore.getTerminatedStateAccount).toHaveBeenCalled();
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityAPI.getTerminatedOutboxAccount(apiContext, chainID);

			expect(sidechainInteroperabilityAPI['getInteroperabilityStore']).toHaveBeenCalledWith(
				apiContext,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			await sidechainInteroperabilityAPI.getTerminatedOutboxAccount(apiContext, chainID);

			expect(sidechainInteroperabilityStore.getTerminatedOutboxAccount).toHaveBeenCalledWith(
				chainID,
			);
		});
	});
});
