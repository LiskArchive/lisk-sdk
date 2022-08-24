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
import { MainchainInteroperabilityAPI } from '../../../../../src/modules/interoperability/mainchain/api';
import { MainchainInteroperabilityStore } from '../../../../../src/modules/interoperability/mainchain/store';
import { APIContext } from '../../../../../src/state_machine';
import { createTransientAPIContext } from '../../../../../src/testing';

describe('Mainchain API', () => {
	const interopMod = new MainchainInteroperabilityModule();

	const chainID = utils.intToBuffer(1, 4);
	const interoperableCCAPIs = new Map();
	let mainchainInteroperabilityAPI: MainchainInteroperabilityAPI;
	let mainchainInteroperabilityStore: MainchainInteroperabilityStore;
	let apiContext: APIContext;

	beforeEach(() => {
		apiContext = createTransientAPIContext({});
		mainchainInteroperabilityAPI = new MainchainInteroperabilityAPI(
			interopMod.stores,
			interopMod.events,
			interoperableCCAPIs,
		);
		mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
			interopMod.stores,
			apiContext,
			interoperableCCAPIs,
		);
		jest
			.spyOn(mainchainInteroperabilityAPI as any, 'getInteroperabilityStore')
			.mockReturnValue(mainchainInteroperabilityStore);
		jest.spyOn(mainchainInteroperabilityStore, 'getChainAccount').mockResolvedValue({} as never);
		jest.spyOn(mainchainInteroperabilityStore, 'getChannel').mockResolvedValue({} as never);
		jest.spyOn(mainchainInteroperabilityStore, 'getOwnChainAccount').mockResolvedValue({} as never);
		jest
			.spyOn(mainchainInteroperabilityStore, 'getTerminatedStateAccount')
			.mockResolvedValue({} as never);
		jest
			.spyOn(mainchainInteroperabilityStore, 'getTerminatedOutboxAccount')
			.mockResolvedValue({} as never);
	});

	describe('getChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityAPI.getChainAccount(apiContext, chainID);

			expect(mainchainInteroperabilityAPI['getInteroperabilityStore']).toHaveBeenCalledWith(
				apiContext,
			);
		});

		it('should call getChainAccount', async () => {
			await mainchainInteroperabilityAPI.getChainAccount(apiContext, chainID);

			expect(mainchainInteroperabilityStore.getChainAccount).toHaveBeenCalledWith(chainID);
		});
	});

	describe('getChannel', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityAPI.getChannel(apiContext, chainID);

			expect(mainchainInteroperabilityAPI['getInteroperabilityStore']).toHaveBeenCalledWith(
				apiContext,
			);
		});

		it('should call getChannel', async () => {
			await mainchainInteroperabilityAPI.getChannel(apiContext, chainID);

			expect(mainchainInteroperabilityStore.getChannel).toHaveBeenCalledWith(chainID);
		});
	});

	describe('getOwnChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityAPI.getOwnChainAccount(apiContext);

			expect(mainchainInteroperabilityAPI['getInteroperabilityStore']).toHaveBeenCalledWith(
				apiContext,
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
				apiContext,
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
				apiContext,
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
