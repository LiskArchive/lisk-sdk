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
import { MainchainInteroperabilityMethod } from '../../../../../src/modules/interoperability/mainchain/method';
import { MainchainInteroperabilityStore } from '../../../../../src/modules/interoperability/mainchain/store';
import { NamedRegistry } from '../../../../../src/modules/named_registry';
import { MethodContext } from '../../../../../src/state_machine';
import { createTransientMethodContext } from '../../../../../src/testing';
import { MAINCHAIN_ID_BUFFER } from '../../../../../src/modules/interoperability/constants';

describe('Mainchain Method', () => {
	const interopMod = new MainchainInteroperabilityModule();

	const chainID = utils.intToBuffer(1, 4);
	const interoperableCCMethods = new Map();
	let mainchainInteroperabilityMethod: MainchainInteroperabilityMethod;
	let mainchainInteroperabilityStore: MainchainInteroperabilityStore;
	let methodContext: MethodContext;

	beforeEach(() => {
		methodContext = createTransientMethodContext({});
		mainchainInteroperabilityMethod = new MainchainInteroperabilityMethod(
			interopMod.stores,
			interopMod.events,
			interoperableCCMethods,
		);
		mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
			interopMod.stores,
			methodContext,
			interoperableCCMethods,
			new NamedRegistry(),
		);
		jest
			.spyOn(mainchainInteroperabilityMethod as any, 'getInteroperabilityStore')
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
		jest.spyOn(mainchainInteroperabilityStore, 'hasChainAccount').mockResolvedValue(false);
	});

	describe('getChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityMethod.getChainAccount(methodContext, chainID);

			expect(mainchainInteroperabilityMethod['getInteroperabilityStore']).toHaveBeenCalledWith(
				methodContext,
			);
		});

		it('should call getChainAccount', async () => {
			await mainchainInteroperabilityMethod.getChainAccount(methodContext, chainID);

			expect(mainchainInteroperabilityStore.getChainAccount).toHaveBeenCalledWith(chainID);
		});
	});

	describe('getChannel', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityMethod.getChannel(methodContext, chainID);

			expect(mainchainInteroperabilityMethod['getInteroperabilityStore']).toHaveBeenCalledWith(
				methodContext,
			);
		});

		it('should call getChannel', async () => {
			await mainchainInteroperabilityMethod.getChannel(methodContext, chainID);

			expect(mainchainInteroperabilityStore.getChannel).toHaveBeenCalledWith(chainID);
		});
	});

	describe('getOwnChainAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityMethod.getOwnChainAccount(methodContext);

			expect(mainchainInteroperabilityMethod['getInteroperabilityStore']).toHaveBeenCalledWith(
				methodContext,
			);
		});

		it('should call getOwnChainAccount', async () => {
			await mainchainInteroperabilityMethod.getOwnChainAccount(methodContext);

			expect(mainchainInteroperabilityStore.getOwnChainAccount).toHaveBeenCalled();
		});
	});

	describe('getTerminatedStateAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityMethod.getTerminatedStateAccount(methodContext, chainID);

			expect(mainchainInteroperabilityMethod['getInteroperabilityStore']).toHaveBeenCalledWith(
				methodContext,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			await mainchainInteroperabilityMethod.getTerminatedStateAccount(methodContext, chainID);

			expect(mainchainInteroperabilityStore.getTerminatedStateAccount).toHaveBeenCalled();
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		it('should call getInteroperabilityStore', async () => {
			await mainchainInteroperabilityMethod.getTerminatedOutboxAccount(methodContext, chainID);

			expect(mainchainInteroperabilityMethod['getInteroperabilityStore']).toHaveBeenCalledWith(
				methodContext,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			await mainchainInteroperabilityMethod.getTerminatedOutboxAccount(methodContext, chainID);

			expect(mainchainInteroperabilityStore.getTerminatedOutboxAccount).toHaveBeenCalledWith(
				chainID,
			);
		});
	});

	describe('getMessageFeeTokenID', () => {
		const newChainID = Buffer.from('1234', 'hex');
		beforeEach(() => {
			jest.spyOn(mainchainInteroperabilityStore, 'getChannel').mockResolvedValue({
				messageFeeTokenID: {
					localID: Buffer.from('10000000', 'hex'),
				},
			} as never);
		});

		it('should assign chainID as MAINCHAIN_ID_BUFFER if chainAccount not found', async () => {
			await mainchainInteroperabilityMethod.getMessageFeeTokenID(methodContext, newChainID);
			expect(mainchainInteroperabilityStore.getChannel).toHaveBeenCalledWith(MAINCHAIN_ID_BUFFER);
		});

		it('should process with input chainID', async () => {
			jest.spyOn(mainchainInteroperabilityStore, 'hasChainAccount').mockResolvedValue(true);

			await mainchainInteroperabilityMethod.getMessageFeeTokenID(methodContext, newChainID);
			expect(mainchainInteroperabilityStore.getChannel).toHaveBeenCalledWith(newChainID);
		});
	});
});
