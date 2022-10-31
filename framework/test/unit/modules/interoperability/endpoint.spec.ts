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
import { ModuleEndpointContext, SidechainInteroperabilityModule } from '../../../../src';
import { BaseInteroperabilityEndpoint } from '../../../../src/modules/interoperability/base_interoperability_endpoint';
import { ChainAccountStore } from '../../../../src/modules/interoperability/stores/chain_account';
import { ChannelDataStore } from '../../../../src/modules/interoperability/stores/channel_data';
import { OwnChainAccountStore } from '../../../../src/modules/interoperability/stores/own_chain_account';
import {
	TerminatedOutboxAccount,
	TerminatedOutboxAccountJSON,
	TerminatedOutboxStore,
} from '../../../../src/modules/interoperability/stores/terminated_outbox';
import {
	TerminatedStateAccount,
	TerminatedStateAccountJSON,
	TerminatedStateStore,
} from '../../../../src/modules/interoperability/stores/terminated_state';
import {
	ChainAccount,
	ChainAccountJSON,
	ChannelData,
	ChannelDataJSON,
	OwnChainAccount,
	OwnChainAccountJSON,
} from '../../../../src/modules/interoperability/types';
import { chainAccountToJSON } from '../../../../src/modules/interoperability/utils';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';

class TestEndpoint extends BaseInteroperabilityEndpoint {}

describe('Test interoperability endpoint', () => {
	const interopMod = new SidechainInteroperabilityModule();
	const chainID = utils.intToBuffer(1, 4);
	const chainAccountStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
		getAllAccounts: jest.fn(),
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
	const terminatedStateAccountStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};
	const terminatedOutboxAccountMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};

	let moduleContext: ModuleEndpointContext;

	const chainAccount: ChainAccount = {
		lastCertificate: {
			height: 100,
			stateRoot: utils.getRandomBytes(32),
			timestamp: Date.now(),
			validatorsHash: utils.getRandomBytes(32),
		},
		name: 'nft',
		status: 1,
	};

	const chainAccount2: ChainAccount = {
		lastCertificate: {
			height: 200,
			stateRoot: utils.getRandomBytes(32),
			timestamp: Date.now(),
			validatorsHash: utils.getRandomBytes(32),
		},
		name: chainAccount.name,
		status: chainAccount.status,
	};

	const chainAccountJSON: ChainAccountJSON = chainAccountToJSON(chainAccount);
	const chainAccount2JSON: ChainAccountJSON = chainAccountToJSON(chainAccount2);

	const channelData: ChannelData = {
		inbox: {
			appendPath: [],
			root: utils.getRandomBytes(32),
			size: 10,
		},
		messageFeeTokenID: Buffer.from('0000000000000011', 'hex'),
		outbox: {
			appendPath: [],
			root: utils.getRandomBytes(32),
			size: 10,
		},
		partnerChainOutboxRoot: utils.getRandomBytes(32),
	};

	const channelDataJSON: ChannelDataJSON = {
		inbox: {
			appendPath: channelData.inbox.appendPath.map(ap => ap.toString('hex')),
			root: channelData.inbox.root.toString('hex'),
			size: channelData.inbox.size,
		},
		messageFeeTokenID: channelData.messageFeeTokenID.toString('hex'),
		outbox: {
			appendPath: channelData.outbox.appendPath.map(ap => ap.toString('hex')),
			root: channelData.outbox.root.toString('hex'),
			size: channelData.outbox.size,
		},
		partnerChainOutboxRoot: channelData.partnerChainOutboxRoot.toString('hex'),
	};

	const terminateStateAccount: TerminatedStateAccount = {
		stateRoot: utils.getRandomBytes(32),
		initialized: true,
		mainchainStateRoot: utils.getRandomBytes(32),
	};

	const terminateStateAccountJSON: TerminatedStateAccountJSON = {
		stateRoot: terminateStateAccount.stateRoot.toString('hex'),
		initialized: terminateStateAccount.initialized,
		mainchainStateRoot: terminateStateAccount.mainchainStateRoot?.toString('hex'),
	};

	const terminatedOutboxAccount: TerminatedOutboxAccount = {
		outboxRoot: utils.getRandomBytes(32),
		outboxSize: 10,
		partnerChainInboxSize: 10,
	};

	const terminatedOutboxAccountJSON: TerminatedOutboxAccountJSON = {
		outboxRoot: terminatedOutboxAccount.outboxRoot.toString('hex'),
		outboxSize: terminatedOutboxAccount.outboxSize,
		partnerChainInboxSize: terminatedOutboxAccount.partnerChainInboxSize,
	};

	const ownChainAccount: OwnChainAccount = {
		chainID: utils.intToBuffer(1, 4),
		name: 'main',
		nonce: BigInt(10),
	};

	const ownChainAccountJSON: OwnChainAccountJSON = {
		chainID: ownChainAccount.chainID.toString('hex'),
		name: ownChainAccount.name,
		nonce: ownChainAccount.nonce.toString(),
	};

	let TestInteroperabilityEndpoint: TestEndpoint;

	beforeEach(() => {
		const stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		moduleContext = {
			getStore: (p1: Buffer, p2: Buffer) => stateStore.getStore(p1, p2),
			getImmutableMethodContext: jest.fn(),
			getOffchainStore: jest.fn(),
			chainID: Buffer.alloc(0),
			params: {},
			logger: {} as any,
		};
		TestInteroperabilityEndpoint = new TestEndpoint(interopMod.stores, interopMod.offchainStores);

		interopMod.stores.register(ChainAccountStore, chainAccountStoreMock as never);
		interopMod.stores.register(ChannelDataStore, channelStoreMock as never);
		interopMod.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);
		interopMod.stores.register(TerminatedStateStore, terminatedStateAccountStoreMock as never);
		interopMod.stores.register(TerminatedOutboxStore, terminatedOutboxAccountMock as never);

		chainAccountStoreMock.get.mockResolvedValue(chainAccount);
		chainAccountStoreMock.getAllAccounts.mockResolvedValue([chainAccount, chainAccount2]);
		channelStoreMock.get.mockResolvedValue(channelData);
		ownChainAccountStoreMock.get.mockResolvedValue(ownChainAccount);
		terminatedStateAccountStoreMock.get.mockResolvedValue(terminateStateAccount);
		terminatedOutboxAccountMock.get.mockResolvedValue(terminatedOutboxAccount);
	});

	describe('getChainAccount', () => {
		let chainAccountResult: ChainAccountJSON;

		beforeEach(async () => {
			chainAccountResult = await TestInteroperabilityEndpoint.getChainAccount(
				moduleContext,
				chainID,
			);
		});

		it('should call getChainAccount', async () => {
			expect(chainAccountStoreMock.get).toHaveBeenCalledWith(expect.anything(), chainID);
		});

		it('should return JSON format result', () => {
			expect(chainAccountResult).toEqual(chainAccountJSON);
		});
	});

	describe('getAllChainAccounts', () => {
		let chainAccountResults: ChainAccountJSON[];

		beforeEach(async () => {
			({ chains: chainAccountResults } = await TestInteroperabilityEndpoint.getAllChainAccounts(
				moduleContext,
				chainID,
			));
		});

		it('should return JSON format result', () => {
			expect(chainAccountResults).toEqual([chainAccountJSON, chainAccount2JSON]);
		});
	});

	describe('getChannel', () => {
		let channelDataResult: ChannelDataJSON;

		beforeEach(async () => {
			channelDataResult = await TestInteroperabilityEndpoint.getChannel(moduleContext, chainID);
		});

		it('should call getChannel', async () => {
			expect(channelStoreMock.get).toHaveBeenCalledWith(expect.anything(), chainID);
		});

		it('should return JSON format result', () => {
			expect(channelDataResult).toEqual(channelDataJSON);
		});
	});

	describe('getOwnChainAccount', () => {
		let ownChainAccountResult: OwnChainAccountJSON;

		beforeEach(async () => {
			ownChainAccountResult = await TestInteroperabilityEndpoint.getOwnChainAccount(moduleContext);
		});

		it('should call getOwnChainAccount', async () => {
			expect(ownChainAccountStoreMock.get).toHaveBeenCalled();
		});

		it('should return JSON format result', () => {
			expect(ownChainAccountResult).toEqual(ownChainAccountJSON);
		});
	});

	describe('getTerminatedStateAccount', () => {
		let terminateStateAccountResult: TerminatedStateAccountJSON;

		beforeEach(async () => {
			terminateStateAccountResult = await TestInteroperabilityEndpoint.getTerminatedStateAccount(
				moduleContext,
				chainID,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			expect(terminatedStateAccountStoreMock.get).toHaveBeenCalled();
		});

		it('should return JSON format result', () => {
			expect(terminateStateAccountResult).toEqual(terminateStateAccountJSON);
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		let terminatedOutboxAccountResult: TerminatedOutboxAccountJSON;

		beforeEach(async () => {
			terminatedOutboxAccountResult = await TestInteroperabilityEndpoint.getTerminatedOutboxAccount(
				moduleContext,
				chainID,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			expect(terminatedOutboxAccountMock.get).toHaveBeenCalledWith(expect.anything(), chainID);
		});

		it('should return JSON format result', () => {
			expect(terminatedOutboxAccountResult).toEqual(terminatedOutboxAccountJSON);
		});
	});
});
