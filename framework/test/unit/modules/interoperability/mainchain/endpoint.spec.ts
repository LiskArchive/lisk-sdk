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
import { intToBuffer } from '@liskhq/lisk-cryptography/dist-node/utils';
import { MainchainInteroperabilityModule, ModuleEndpointContext } from '../../../../../src';
import { MainchainInteroperabilityEndpoint } from '../../../../../src/modules/interoperability/mainchain/endpoint';
import { MainchainInteroperabilityStore } from '../../../../../src/modules/interoperability/mainchain/store';
import {
	TerminatedStateAccount,
	TerminatedStateAccountJSON,
} from '../../../../../src/modules/interoperability/stores/terminated_state';
import {
	TerminatedOutboxAccount,
	TerminatedOutboxAccountJSON,
} from '../../../../../src/modules/interoperability/stores/terminated_outbox';
import {
	ChainAccount,
	ChainAccountJSON,
	ChannelData,
	ChannelDataJSON,
	OwnChainAccount,
	OwnChainAccountJSON,
} from '../../../../../src/modules/interoperability/types';
import { chainAccountToJSON } from '../../../../../src/modules/interoperability/utils';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { createTransientModuleEndpointContext } from '../../../../../src/testing';

describe('Mainchain endpoint', () => {
	const interopMod = new MainchainInteroperabilityModule();

	const chainID = utils.intToBuffer(1, 4);
	const interoperableCCMethods = new Map();

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
		messageFeeTokenID: {
			chainID: intToBuffer(0, 4),
			localID: intToBuffer(1, 4),
		},
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
		messageFeeTokenID: {
			chainID: channelData.messageFeeTokenID.chainID.toString('hex'),
			localID: channelData.messageFeeTokenID.localID.toString('hex'),
		},
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
		id: intToBuffer(1, 4),
		name: 'main',
		nonce: BigInt(10),
	};

	const ownChainAccountJSON: OwnChainAccountJSON = {
		id: ownChainAccount.id.toString('hex'),
		name: ownChainAccount.name,
		nonce: ownChainAccount.nonce.toString(),
	};

	let mainchainInteroperabilityEndpoint: MainchainInteroperabilityEndpoint;
	let mainchainInteroperabilityStore: MainchainInteroperabilityStore;

	beforeEach(() => {
		const stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		moduleContext = createTransientModuleEndpointContext({ stateStore });

		mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
			interopMod.stores,
			moduleContext,
			interoperableCCMethods,
		);
		mainchainInteroperabilityEndpoint = new MainchainInteroperabilityEndpoint(
			interopMod.stores,
			interopMod.offchainStores,
			interoperableCCMethods,
		);

		jest
			.spyOn(mainchainInteroperabilityEndpoint as any, 'getInteroperabilityStore')
			.mockReturnValue(mainchainInteroperabilityStore);
		jest.spyOn(mainchainInteroperabilityStore, 'getChainAccount').mockResolvedValue(chainAccount);
		jest
			.spyOn(mainchainInteroperabilityStore, 'getAllChainAccounts')
			.mockResolvedValue([chainAccount, chainAccount2]);
		jest.spyOn(mainchainInteroperabilityStore, 'getChannel').mockResolvedValue(channelData);
		jest
			.spyOn(mainchainInteroperabilityStore, 'getOwnChainAccount')
			.mockResolvedValue(ownChainAccount);
		jest
			.spyOn(mainchainInteroperabilityStore, 'getTerminatedStateAccount')
			.mockResolvedValue(terminateStateAccount);
		jest
			.spyOn(mainchainInteroperabilityStore, 'getTerminatedOutboxAccount')
			.mockResolvedValue(terminatedOutboxAccount);
	});

	describe('getChainAccount', () => {
		let chainAccountResult: ChainAccountJSON;

		beforeEach(async () => {
			chainAccountResult = await mainchainInteroperabilityEndpoint.getChainAccount(
				moduleContext,
				chainID,
			);
		});
		it('should call getInteroperabilityStore', async () => {
			expect(mainchainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext,
			);
		});

		it('should call getChainAccount', async () => {
			expect(mainchainInteroperabilityStore.getChainAccount).toHaveBeenCalledWith(chainID);
		});

		it('should return JSON format result', () => {
			expect(chainAccountResult).toEqual(chainAccountJSON);
		});
	});

	describe('getAllChainAccounts', () => {
		let chainAccountResults: ChainAccountJSON[];

		beforeEach(async () => {
			({
				chains: chainAccountResults,
			} = await mainchainInteroperabilityEndpoint.getAllChainAccounts(moduleContext, chainID));
		});
		it('should call getInteroperabilityStore', async () => {
			expect(mainchainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext,
			);
		});

		it('should call getAllChainAccounts', async () => {
			expect(mainchainInteroperabilityStore.getAllChainAccounts).toHaveBeenCalledWith(chainID);
		});

		it('should return JSON format result', () => {
			expect(chainAccountResults).toEqual([chainAccountJSON, chainAccount2JSON]);
		});
	});

	describe('getChannel', () => {
		let channelDataResult: ChannelDataJSON;

		beforeEach(async () => {
			channelDataResult = await mainchainInteroperabilityEndpoint.getChannel(
				moduleContext,
				chainID,
			);
		});

		it('should call getInteroperabilityStore', async () => {
			expect(mainchainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext,
			);
		});

		it('should call getChannel', async () => {
			expect(mainchainInteroperabilityStore.getChannel).toHaveBeenCalledWith(chainID);
		});

		it('should return JSON format result', () => {
			expect(channelDataResult).toEqual(channelDataJSON);
		});
	});

	describe('getOwnChainAccount', () => {
		let ownChainAccountResult: OwnChainAccountJSON;

		beforeEach(async () => {
			ownChainAccountResult = await mainchainInteroperabilityEndpoint.getOwnChainAccount(
				moduleContext,
			);
		});

		it('should call getInteroperabilityStore', async () => {
			expect(mainchainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext,
			);
		});

		it('should call getOwnChainAccount', async () => {
			expect(mainchainInteroperabilityStore.getOwnChainAccount).toHaveBeenCalled();
		});

		it('should return JSON format result', () => {
			expect(ownChainAccountResult).toEqual(ownChainAccountJSON);
		});
	});

	describe('getTerminatedStateAccount', () => {
		let terminateStateAccountResult: TerminatedStateAccountJSON;

		beforeEach(async () => {
			terminateStateAccountResult = await mainchainInteroperabilityEndpoint.getTerminatedStateAccount(
				moduleContext,
				chainID,
			);
		});

		it('should call getInteroperabilityStore', async () => {
			expect(mainchainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			expect(mainchainInteroperabilityStore.getTerminatedStateAccount).toHaveBeenCalled();
		});

		it('should return JSON format result', () => {
			expect(terminateStateAccountResult).toEqual(terminateStateAccountJSON);
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		let terminatedOutboxAccountResult: TerminatedOutboxAccountJSON;

		beforeEach(async () => {
			terminatedOutboxAccountResult = await mainchainInteroperabilityEndpoint.getTerminatedOutboxAccount(
				moduleContext,
				chainID,
			);
		});

		it('should call getInteroperabilityStore', async () => {
			expect(mainchainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			expect(mainchainInteroperabilityStore.getTerminatedOutboxAccount).toHaveBeenCalledWith(
				chainID,
			);
		});

		it('should return JSON format result', () => {
			expect(terminatedOutboxAccountResult).toEqual(terminatedOutboxAccountJSON);
		});
	});
});
