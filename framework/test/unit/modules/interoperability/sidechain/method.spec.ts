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
import { SidechainInteroperabilityInternalMethod } from '../../../../../src/modules/interoperability/sidechain/store';
import { ChainAccountStore } from '../../../../../src/modules/interoperability/stores/chain_account';
import { ChannelDataStore } from '../../../../../src/modules/interoperability/stores/channel_data';
import { OwnChainAccountStore } from '../../../../../src/modules/interoperability/stores/own_chain_account';
import { TerminatedOutboxStore } from '../../../../../src/modules/interoperability/stores/terminated_outbox';
import { TerminatedStateStore } from '../../../../../src/modules/interoperability/stores/terminated_state';
import { NamedRegistry } from '../../../../../src/modules/named_registry';
import { MethodContext } from '../../../../../src/state_machine';
import { MAINCHAIN_ID_BUFFER } from '../../../../../src/modules/interoperability/constants';
import { createTransientMethodContext } from '../../../../../src/testing';

describe('Sidechain Method', () => {
	const interopMod = new SidechainInteroperabilityModule();
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
	const chainID = utils.intToBuffer(1, 4);
	const interoperableCCMethods = new Map();

	let methodContext: MethodContext;
	let sidechainInteroperabilityMethod: SidechainInteroperabilityMethod;
	let sidechainInteroperabilityInternalMethod: SidechainInteroperabilityInternalMethod;

	beforeEach(() => {
		methodContext = createTransientMethodContext({});
		sidechainInteroperabilityMethod = new SidechainInteroperabilityMethod(
			interopMod.stores,
			interopMod.events,
			interoperableCCMethods,
		);
		sidechainInteroperabilityInternalMethod = new SidechainInteroperabilityInternalMethod(
			interopMod.stores,
			new NamedRegistry(),
			methodContext,
			interoperableCCMethods,
		);
		jest
			.spyOn(sidechainInteroperabilityMethod as any, 'getInteroperabilityInternalMethod')
			.mockReturnValue(sidechainInteroperabilityInternalMethod);

		interopMod.stores.register(ChainAccountStore, chainAccountStoreMock as never);
		interopMod.stores.register(ChannelDataStore, channelStoreMock as never);
		interopMod.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);
		interopMod.stores.register(TerminatedStateStore, terminateStateAccountStoreMock as never);
		interopMod.stores.register(TerminatedOutboxStore, terminatedOutboxAccountMock as never);
	});

	describe('getChainAccount', () => {
		it('should call getChainAccount', async () => {
			await sidechainInteroperabilityMethod.getChainAccount(methodContext, chainID);

			expect(chainAccountStoreMock.get).toHaveBeenCalledWith(expect.anything(), chainID);
		});
	});

	describe('getChannel', () => {
		it('should call getChannel', async () => {
			await sidechainInteroperabilityMethod.getChannel(methodContext, chainID);

			expect(channelStoreMock.get).toHaveBeenCalledWith(expect.anything(), chainID);
		});
	});

	describe('getOwnChainAccount', () => {
		it('should call getOwnChainAccount', async () => {
			await sidechainInteroperabilityMethod.getOwnChainAccount(methodContext);

			expect(ownChainAccountStoreMock.get).toHaveBeenCalled();
		});
	});

	describe('getTerminatedStateAccount', () => {
		it('should call getTerminatedStateAccount', async () => {
			await sidechainInteroperabilityMethod.getTerminatedStateAccount(methodContext, chainID);

			expect(terminateStateAccountStoreMock.get).toHaveBeenCalled();
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		it('should call getTerminatedStateAccount', async () => {
			await sidechainInteroperabilityMethod.getTerminatedOutboxAccount(methodContext, chainID);

			expect(terminatedOutboxAccountMock.get).toHaveBeenCalledWith(expect.anything(), chainID);
		});
	});

	describe('getMessageFeeTokenID', () => {
		const newChainID = Buffer.from('1234', 'hex');
		beforeEach(() => {
			jest.spyOn(channelStoreMock, 'get').mockResolvedValue({
				messageFeeTokenID: {
					localID: Buffer.from('10000000', 'hex'),
				},
			} as never);
		});

		it('should assign chainID as MAINCHAIN_ID_BUFFER if chainAccount not found', async () => {
			await sidechainInteroperabilityMethod.getMessageFeeTokenID(methodContext, newChainID);
			expect(channelStoreMock.get).toHaveBeenCalledWith(expect.anything(), MAINCHAIN_ID_BUFFER);
		});

		it('should process with input chainID', async () => {
			jest.spyOn(chainAccountStoreMock, 'has').mockResolvedValue(true);

			await sidechainInteroperabilityMethod.getMessageFeeTokenID(methodContext, newChainID);
			expect(channelStoreMock.get).toHaveBeenCalledWith(expect.anything(), newChainID);
		});
	});
});
