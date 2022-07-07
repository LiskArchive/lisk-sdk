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

import { SidechainInteroperabilityAPI } from '../../../../../src/modules/interoperability/sidechain/api';
import { SidechainInteroperabilityStore } from '../../../../../src/modules/interoperability/sidechain/store';

describe('Sidechain API', () => {
	const moduleID = 1;
	const chainID = Buffer.alloc(0);
	const chainIDasNumber = 1;
	const interoperableCCAPIs = new Map();
	const getStore = jest.fn().mockReturnValue({ getWithSchema: jest.fn() });
	const apiContext = {
		getStore,
		eventQueue: {
			add: jest.fn(),
		},
	};
	let sidechainInteroperabilityAPI: SidechainInteroperabilityAPI;
	let sidechainInteroperabilityStore = new SidechainInteroperabilityStore(
		moduleID,
		getStore,
		interoperableCCAPIs,
	);

	beforeEach(() => {
		sidechainInteroperabilityAPI = new SidechainInteroperabilityAPI(moduleID, interoperableCCAPIs);
		sidechainInteroperabilityStore = new SidechainInteroperabilityStore(
			moduleID,
			getStore,
			interoperableCCAPIs,
		);
		jest
			.spyOn(sidechainInteroperabilityAPI as any, 'getInteroperabilityStore')
			.mockReturnValue(sidechainInteroperabilityStore);
		jest.spyOn(sidechainInteroperabilityStore, 'getChainAccount');
		jest.spyOn(sidechainInteroperabilityStore, 'getChannel');
		jest.spyOn(sidechainInteroperabilityStore, 'getOwnChainAccount');
		jest.spyOn(sidechainInteroperabilityStore, 'getTerminatedStateAccount');
		jest.spyOn(sidechainInteroperabilityStore, 'getTerminatedOutboxAccount');
	});

	describe('getChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityAPI.getChainAccount(apiContext, chainID);

			expect(sidechainInteroperabilityAPI['getInteroperabilityStore']).toHaveBeenCalledWith(
				apiContext.getStore,
			);
		});

		it('should call getChainAccount', async () => {
			await sidechainInteroperabilityAPI.getChainAccount(apiContext, chainID);

			expect(sidechainInteroperabilityStore.getChainAccount).toHaveBeenCalledWith(chainID);
		});
	});

	describe('getChannel', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityAPI.getChannel(apiContext, chainIDasNumber);

			expect(sidechainInteroperabilityAPI['getInteroperabilityStore']).toHaveBeenCalledWith(
				apiContext.getStore,
			);
		});

		it('should call getChannel', async () => {
			await sidechainInteroperabilityAPI.getChannel(apiContext, chainIDasNumber);

			expect(sidechainInteroperabilityStore.getChannel).toHaveBeenCalledWith(chainIDasNumber);
		});
	});

	describe('getOwnChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityAPI.getOwnChainAccount(apiContext);

			expect(sidechainInteroperabilityAPI['getInteroperabilityStore']).toHaveBeenCalledWith(
				apiContext.getStore,
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
				apiContext.getStore,
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
				apiContext.getStore,
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
