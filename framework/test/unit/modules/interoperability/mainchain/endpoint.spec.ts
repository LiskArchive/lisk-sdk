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
import { MainchainInteroperabilityEndpoint } from '../../../../../src/modules/interoperability/mainchain/endpoint';
import { MainchainInteroperabilityStore } from '../../../../../src/modules/interoperability/mainchain/store';

describe('Mainchain endpoint', () => {
	const moduleID = utils.intToBuffer(1, 4);
	const chainID = utils.intToBuffer(1, 4);
	const interoperableCCAPIs = new Map();
	const getStore = jest.fn().mockReturnValue({ getWithSchema: jest.fn() });

	const moduleContext = {
		getStore,
		getImmutableAPIContext: jest.fn(),
		networkIdentifier: Buffer.alloc(0),
		params: {},
		logger: {} as any,
	};
	let mainchainInteroperabilityEndpoint: MainchainInteroperabilityEndpoint;
	let mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
		moduleID,
		getStore,
		interoperableCCAPIs,
	);

	beforeEach(() => {
		mainchainInteroperabilityEndpoint = new MainchainInteroperabilityEndpoint(
			moduleID,
			interoperableCCAPIs,
		);
		mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
			moduleID,
			getStore,
			interoperableCCAPIs,
		);
		jest
			.spyOn(mainchainInteroperabilityEndpoint as any, 'getInteroperabilityStore')
			.mockReturnValue(mainchainInteroperabilityStore);
		jest.spyOn(mainchainInteroperabilityStore, 'getChainAccount');
		jest.spyOn(mainchainInteroperabilityStore, 'getChannel');
		jest.spyOn(mainchainInteroperabilityStore, 'getOwnChainAccount');
		jest.spyOn(mainchainInteroperabilityStore, 'getTerminatedStateAccount');
		jest.spyOn(mainchainInteroperabilityStore, 'getTerminatedOutboxAccount');
	});

	describe('getChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityEndpoint.getChainAccount(moduleContext, chainID);

			expect(mainchainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext.getStore,
			);
		});

		it('should call getChainAccount', async () => {
			await mainchainInteroperabilityEndpoint.getChainAccount(moduleContext, chainID);

			expect(mainchainInteroperabilityStore.getChainAccount).toHaveBeenCalledWith(chainID);
		});
	});

	describe('getChannel', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityEndpoint.getChannel(moduleContext, chainID);

			expect(mainchainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext.getStore,
			);
		});

		it('should call getChannel', async () => {
			await mainchainInteroperabilityEndpoint.getChannel(moduleContext, chainID);

			expect(mainchainInteroperabilityStore.getChannel).toHaveBeenCalledWith(chainID);
		});
	});

	describe('getOwnChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityEndpoint.getOwnChainAccount(moduleContext);

			expect(mainchainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext.getStore,
			);
		});

		it('should call getOwnChainAccount', async () => {
			await mainchainInteroperabilityEndpoint.getOwnChainAccount(moduleContext);

			expect(mainchainInteroperabilityStore.getOwnChainAccount).toHaveBeenCalled();
		});
	});

	describe('getTerminatedStateAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityEndpoint.getTerminatedStateAccount(moduleContext, chainID);

			expect(mainchainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext.getStore,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			await mainchainInteroperabilityEndpoint.getTerminatedStateAccount(moduleContext, chainID);

			expect(mainchainInteroperabilityStore.getTerminatedStateAccount).toHaveBeenCalled();
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityEndpoint.getTerminatedOutboxAccount(moduleContext, chainID);

			expect(mainchainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext.getStore,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			await mainchainInteroperabilityEndpoint.getTerminatedOutboxAccount(moduleContext, chainID);

			expect(mainchainInteroperabilityStore.getTerminatedOutboxAccount).toHaveBeenCalledWith(
				chainID,
			);
		});
	});
});
