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

import { MainchainInteroperabilityAPI } from '../../../../../src/modules/interoperability/mainchain/api';
import { MainchainInteroperabilityStore } from '../../../../../src/modules/interoperability/mainchain/store';

describe('Mainchain API', () => {
	const moduleID = 1;
	const chainID = Buffer.alloc(0);
	const chainIDasNumber = 1;
	const interoperableCCAPIs = new Map();
	const getStore = jest.fn().mockReturnValue({ getWithSchema: jest.fn() });
	const apiContext = {
		getStore: jest.fn().mockReturnValue({ getWithSchema: jest.fn() }),
		eventQueue: {
			add: jest.fn(),
		},
	};
	let mainchainInteroperabilityAPI: MainchainInteroperabilityAPI;
	let mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
		moduleID,
		getStore,
		interoperableCCAPIs,
	);

	beforeEach(() => {
		mainchainInteroperabilityAPI = new MainchainInteroperabilityAPI(moduleID, interoperableCCAPIs);
		mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
			moduleID,
			getStore,
			interoperableCCAPIs,
		);
		jest
			.spyOn(mainchainInteroperabilityAPI as any, 'getInteroperabilityStore')
			.mockReturnValue(mainchainInteroperabilityStore);
		jest.spyOn(mainchainInteroperabilityStore, 'getChainAccount');
		jest.spyOn(mainchainInteroperabilityStore, 'getChannel');
		jest.spyOn(mainchainInteroperabilityStore, 'getOwnChainAccount');
		jest.spyOn(mainchainInteroperabilityStore, 'getTerminatedStateAccount');
		jest.spyOn(mainchainInteroperabilityStore, 'getTerminatedOutboxAccount');
	});

	describe('getChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityAPI.getChainAccount(apiContext, chainID);

			expect(mainchainInteroperabilityAPI['getInteroperabilityStore']).toHaveBeenCalledWith(
				apiContext.getStore,
			);
		});

		it('should call getChainAccount', async () => {
			await mainchainInteroperabilityAPI.getChainAccount(apiContext, chainID);

			expect(mainchainInteroperabilityStore.getChainAccount).toHaveBeenCalledWith(chainID);
		});
	});

	describe('getChannel', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityAPI.getChannel(apiContext, chainIDasNumber);

			expect(mainchainInteroperabilityAPI['getInteroperabilityStore']).toHaveBeenCalledWith(
				apiContext.getStore,
			);
		});

		it('should call getChannel', async () => {
			await mainchainInteroperabilityAPI.getChannel(apiContext, chainIDasNumber);

			expect(mainchainInteroperabilityStore.getChannel).toHaveBeenCalledWith(chainIDasNumber);
		});
	});

	describe('getOwnChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityAPI.getOwnChainAccount(apiContext);

			expect(mainchainInteroperabilityAPI['getInteroperabilityStore']).toHaveBeenCalledWith(
				apiContext.getStore,
			);
		});

		it('should call getOwnChainAccount', async () => {
			await mainchainInteroperabilityAPI.getOwnChainAccount(apiContext);

			expect(mainchainInteroperabilityStore.getOwnChainAccount).toHaveBeenCalled();
		});
	});

	describe('getTerminatedStateAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityAPI.getTerminatedStateAccount(apiContext, chainID);

			expect(mainchainInteroperabilityAPI['getInteroperabilityStore']).toHaveBeenCalledWith(
				apiContext.getStore,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			await mainchainInteroperabilityAPI.getTerminatedStateAccount(apiContext, chainID);

			expect(mainchainInteroperabilityStore.getTerminatedStateAccount).toHaveBeenCalled();
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityAPI.getTerminatedOutboxAccount(apiContext, chainID);

			expect(mainchainInteroperabilityAPI['getInteroperabilityStore']).toHaveBeenCalledWith(
				apiContext.getStore,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			await mainchainInteroperabilityAPI.getTerminatedOutboxAccount(apiContext, chainID);

			expect(mainchainInteroperabilityStore.getTerminatedOutboxAccount).toHaveBeenCalledWith(
				chainID,
			);
		});
	});
});
