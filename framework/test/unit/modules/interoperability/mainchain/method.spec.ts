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
import { ChainAccountStore } from '../../../../../src/modules/interoperability/stores/chain_account';
import { ChannelDataStore } from '../../../../../src/modules/interoperability/stores/channel_data';
import { OwnChainAccountStore } from '../../../../../src/modules/interoperability/stores/own_chain_account';
import { TerminatedOutboxStore } from '../../../../../src/modules/interoperability/stores/terminated_outbox';
import { TerminatedStateStore } from '../../../../../src/modules/interoperability/stores/terminated_state';
import { NamedRegistry } from '../../../../../src/modules/named_registry';
import { MethodContext } from '../../../../../src/state_machine';
import { createTransientMethodContext } from '../../../../../src/testing';
import { MAINCHAIN_ID_BUFFER } from '../../../../../src/modules/interoperability/constants';

describe('Mainchain Method', () => {
	const interopMod = new MainchainInteroperabilityModule();

	const chainID = utils.intToBuffer(1, 4);
	const interoperableCCMethods = new Map();
	const chainAccountStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};
	const channelStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};
	const ownChainAccountStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};
	const terminateStateAccountStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};
	const terminatedOutboxAccountMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};
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

		interopMod.stores.register(ChainAccountStore, chainAccountStoreMock as never);
		interopMod.stores.register(ChannelDataStore, channelStoreMock as never);
		interopMod.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);
		interopMod.stores.register(TerminatedStateStore, terminateStateAccountStoreMock as never);
		interopMod.stores.register(TerminatedOutboxStore, terminatedOutboxAccountMock as never);
	});

	describe('getChainAccount', () => {
		it('should call getChainAccount', async () => {
			await mainchainInteroperabilityMethod.getChainAccount(methodContext, chainID);

			expect(chainAccountStoreMock.get).toHaveBeenCalledWith(methodContext, chainID);
		});
	});

	describe('getChannel', () => {
		it('should call getChannel', async () => {
			await mainchainInteroperabilityMethod.getChannel(methodContext, chainID);

			expect(channelStoreMock.get).toHaveBeenCalledWith(methodContext, chainID);
		});
	});

	describe('getOwnChainAccount', () => {
		it('should call getOwnChainAccount', async () => {
			await mainchainInteroperabilityMethod.getOwnChainAccount(methodContext);

			expect(ownChainAccountStoreMock.get).toHaveBeenCalled();
		});
	});

	describe('getTerminatedStateAccount', () => {
		it('should call getTerminatedStateAccount', async () => {
			await mainchainInteroperabilityMethod.getTerminatedStateAccount(methodContext, chainID);

			expect(terminateStateAccountStoreMock.get).toHaveBeenCalled();
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		it('should call getTerminatedStateAccount', async () => {
			await mainchainInteroperabilityMethod.getTerminatedOutboxAccount(methodContext, chainID);

			expect(terminatedOutboxAccountMock.get).toHaveBeenCalledWith(methodContext, chainID);
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
