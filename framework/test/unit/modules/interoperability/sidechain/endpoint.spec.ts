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

import { intToBuffer } from '@liskhq/lisk-cryptography';
import { SidechainInteroperabilityEndpoint } from '../../../../../src/modules/interoperability/sidechain/endpoint';
import { SidechainInteroperabilityStore } from '../../../../../src/modules/interoperability/sidechain/store';

describe('Sidechain endpoint', () => {
	const moduleID = intToBuffer(1, 4);
	const chainID = intToBuffer(1, 4);
	const interoperableCCAPIs = new Map();
	const getStore = jest.fn().mockReturnValue({ getWithSchema: jest.fn() });

	const moduleContext = {
		getStore,
		getImmutableAPIContext: jest.fn(),
		networkIdentifier: Buffer.alloc(0),
		params: {},
		logger: {} as any,
	};
	let sidechainInteroperabilityEndpoint: SidechainInteroperabilityEndpoint;
	let sidechainInteroperabilityStore = new SidechainInteroperabilityStore(
		moduleID,
		getStore,
		interoperableCCAPIs,
	);

	beforeEach(() => {
		sidechainInteroperabilityEndpoint = new SidechainInteroperabilityEndpoint(
			moduleID,
			interoperableCCAPIs,
		);
		sidechainInteroperabilityStore = new SidechainInteroperabilityStore(
			moduleID,
			getStore,
			interoperableCCAPIs,
		);
		jest
			.spyOn(sidechainInteroperabilityEndpoint as any, 'getInteroperabilityStore')
			.mockReturnValue(sidechainInteroperabilityStore);
		jest.spyOn(sidechainInteroperabilityStore, 'getChainAccount');
		jest.spyOn(sidechainInteroperabilityStore, 'getChannel');
		jest.spyOn(sidechainInteroperabilityStore, 'getOwnChainAccount');
		jest.spyOn(sidechainInteroperabilityStore, 'getTerminatedStateAccount');
		jest.spyOn(sidechainInteroperabilityStore, 'getTerminatedOutboxAccount');
	});

	describe('getChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityEndpoint.getChainAccount(moduleContext, chainID);

			expect(sidechainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext.getStore,
			);
		});

		it('should call getChainAccount', async () => {
			await sidechainInteroperabilityEndpoint.getChainAccount(moduleContext, chainID);

			expect(sidechainInteroperabilityStore.getChainAccount).toHaveBeenCalledWith(chainID);
		});
	});

	describe('getChannel', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityEndpoint.getChannel(moduleContext, chainID);

			expect(sidechainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext.getStore,
			);
		});

		it('should call getChannel', async () => {
			await sidechainInteroperabilityEndpoint.getChannel(moduleContext, chainID);

			expect(sidechainInteroperabilityStore.getChannel).toHaveBeenCalledWith(chainID);
		});
	});

	describe('getOwnChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityEndpoint.getOwnChainAccount(moduleContext);

			expect(sidechainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext.getStore,
			);
		});

		it('should call getOwnChainAccount', async () => {
			await sidechainInteroperabilityEndpoint.getOwnChainAccount(moduleContext);

			expect(sidechainInteroperabilityStore.getOwnChainAccount).toHaveBeenCalled();
		});
	});

	describe('getTerminatedStateAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityEndpoint.getTerminatedStateAccount(moduleContext, chainID);

			expect(sidechainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext.getStore,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			await sidechainInteroperabilityEndpoint.getTerminatedStateAccount(moduleContext, chainID);

			expect(sidechainInteroperabilityStore.getTerminatedStateAccount).toHaveBeenCalled();
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityEndpoint.getTerminatedOutboxAccount(moduleContext, chainID);

			expect(sidechainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext.getStore,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			await sidechainInteroperabilityEndpoint.getTerminatedOutboxAccount(moduleContext, chainID);

			expect(sidechainInteroperabilityStore.getTerminatedOutboxAccount).toHaveBeenCalledWith(
				chainID,
			);
		});
	});
});
