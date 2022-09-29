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
import { SidechainInteroperabilityMethod } from '../../../../../src/modules/interoperability/sidechain/method';
import { SidechainInteroperabilityStore } from '../../../../../src/modules/interoperability/sidechain/store';
import { NamedRegistry } from '../../../../../src/modules/named_registry';
import { MethodContext } from '../../../../../src/state_machine';

describe('Sidechain Method', () => {
	const interopMod = new SidechainInteroperabilityModule();

	const chainID = utils.intToBuffer(1, 4);
	const interoperableCCMethods = new Map();

	let methodContext: MethodContext;
	let sidechainInteroperabilityMethod: SidechainInteroperabilityMethod;
	let sidechainInteroperabilityStore: SidechainInteroperabilityStore;

	beforeEach(() => {
		sidechainInteroperabilityMethod = new SidechainInteroperabilityMethod(
			interopMod.stores,
			interopMod.events,
			interoperableCCMethods,
		);
		sidechainInteroperabilityStore = new SidechainInteroperabilityStore(
			interopMod.stores,
			methodContext,
			interoperableCCMethods,
			new NamedRegistry(),
		);
		jest
			.spyOn(sidechainInteroperabilityMethod as any, 'getInteroperabilityStore')
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
			await sidechainInteroperabilityMethod.getChainAccount(methodContext, chainID);

			expect(sidechainInteroperabilityMethod['getInteroperabilityStore']).toHaveBeenCalledWith(
				methodContext,
			);
		});

		it('should call getChainAccount', async () => {
			await sidechainInteroperabilityMethod.getChainAccount(methodContext, chainID);

			expect(sidechainInteroperabilityStore.getChainAccount).toHaveBeenCalledWith(chainID);
		});
	});

	describe('getChannel', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityMethod.getChannel(methodContext, chainID);

			expect(sidechainInteroperabilityMethod['getInteroperabilityStore']).toHaveBeenCalledWith(
				methodContext,
			);
		});

		it('should call getChannel', async () => {
			await sidechainInteroperabilityMethod.getChannel(methodContext, chainID);

			expect(sidechainInteroperabilityStore.getChannel).toHaveBeenCalledWith(chainID);
		});
	});

	describe('getOwnChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityMethod.getOwnChainAccount(methodContext);

			expect(sidechainInteroperabilityMethod['getInteroperabilityStore']).toHaveBeenCalledWith(
				methodContext,
			);
		});

		it('should call getOwnChainAccount', async () => {
			await sidechainInteroperabilityMethod.getOwnChainAccount(methodContext);

			expect(sidechainInteroperabilityStore.getOwnChainAccount).toHaveBeenCalled();
		});
	});

	describe('getTerminatedStateAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityMethod.getTerminatedStateAccount(methodContext, chainID);

			expect(sidechainInteroperabilityMethod['getInteroperabilityStore']).toHaveBeenCalledWith(
				methodContext,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			await sidechainInteroperabilityMethod.getTerminatedStateAccount(methodContext, chainID);

			expect(sidechainInteroperabilityStore.getTerminatedStateAccount).toHaveBeenCalled();
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await sidechainInteroperabilityMethod.getTerminatedOutboxAccount(methodContext, chainID);

			expect(sidechainInteroperabilityMethod['getInteroperabilityStore']).toHaveBeenCalledWith(
				methodContext,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			await sidechainInteroperabilityMethod.getTerminatedOutboxAccount(methodContext, chainID);

			expect(sidechainInteroperabilityStore.getTerminatedOutboxAccount).toHaveBeenCalledWith(
				chainID,
			);
		});
	});
});
