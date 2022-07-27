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
import { SidechainInteroperabilityEndpoint } from '../../../../../src/modules/interoperability/sidechain/endpoint';
import { SidechainInteroperabilityStore } from '../../../../../src/modules/interoperability/sidechain/store';
import {
	ChainAccount,
	ChainAccountJSON,
	ChannelData,
	ChannelDataJSON,
	OwnChainAccount,
	OwnChainAccountJSON,
	TerminatedOutboxAccount,
	TerminatedOutboxAccountJSON,
	TerminatedStateAccount,
	TerminatedStateAccountJSON,
} from '../../../../../src/modules/interoperability/types';

describe('Sidechain endpoint', () => {
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

	const chainAccount: ChainAccount = {
		lastCertificate: {
			height: 100,
			stateRoot: utils.getRandomBytes(32),
			timestamp: Date.now(),
			validatorsHash: utils.getRandomBytes(32),
		},
		name: 'nft',
		networkID: utils.getRandomBytes(32),
		status: 1,
	};

	const chainAccountJSON: ChainAccountJSON = {
		lastCertificate: {
			height: chainAccount.lastCertificate.height,
			stateRoot: chainAccount.lastCertificate.stateRoot.toString('hex'),
			timestamp: chainAccount.lastCertificate.timestamp,
			validatorsHash: chainAccount.lastCertificate.validatorsHash.toString('hex'),
		},
		name: chainAccount.name,
		networkID: chainAccount.networkID.toString('hex'),
		status: chainAccount.status,
	};

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
		jest.spyOn(sidechainInteroperabilityStore, 'getChainAccount').mockResolvedValue(chainAccount);
		jest.spyOn(sidechainInteroperabilityStore, 'getChannel').mockResolvedValue(channelData);
		jest
			.spyOn(sidechainInteroperabilityStore, 'getOwnChainAccount')
			.mockResolvedValue(ownChainAccount);
		jest
			.spyOn(sidechainInteroperabilityStore, 'getTerminatedStateAccount')
			.mockResolvedValue(terminateStateAccount);
		jest
			.spyOn(sidechainInteroperabilityStore, 'getTerminatedOutboxAccount')
			.mockResolvedValue(terminatedOutboxAccount);
	});

	describe('getChainAccount', () => {
		let chainAccountResult: ChainAccountJSON;

		beforeEach(async () => {
			chainAccountResult = await sidechainInteroperabilityEndpoint.getChainAccount(
				moduleContext,
				chainID,
			);
		});
		it('should call getInteroperabilityStore', async () => {
			expect(sidechainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext.getStore,
			);
		});

		it('should call getChainAccount', async () => {
			expect(sidechainInteroperabilityStore.getChainAccount).toHaveBeenCalledWith(chainID);
		});

		it('should return JSON format result', () => {
			expect(chainAccountResult).toEqual(chainAccountJSON);
		});
	});

	describe('getChannel', () => {
		let channelDataResult: ChannelDataJSON;

		beforeEach(async () => {
			channelDataResult = await sidechainInteroperabilityEndpoint.getChannel(
				moduleContext,
				chainID,
			);
		});

		it('should call getInteroperabilityStore', async () => {
			expect(sidechainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext.getStore,
			);
		});

		it('should call getChannel', async () => {
			expect(sidechainInteroperabilityStore.getChannel).toHaveBeenCalledWith(chainID);
		});

		it('should return JSON format result', () => {
			expect(channelDataResult).toEqual(channelDataJSON);
		});
	});

	describe('getOwnChainAccount', () => {
		let ownChainAccountResult: OwnChainAccountJSON;

		beforeEach(async () => {
			ownChainAccountResult = await sidechainInteroperabilityEndpoint.getOwnChainAccount(
				moduleContext,
			);
		});

		it('should call getInteroperabilityStore', async () => {
			expect(sidechainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext.getStore,
			);
		});

		it('should call getOwnChainAccount', async () => {
			expect(sidechainInteroperabilityStore.getOwnChainAccount).toHaveBeenCalled();
		});

		it('should return JSON format result', () => {
			expect(ownChainAccountResult).toEqual(ownChainAccountJSON);
		});
	});

	describe('getTerminatedStateAccount', () => {
		let terminateStateAccountResult: TerminatedStateAccountJSON;

		beforeEach(async () => {
			terminateStateAccountResult = await sidechainInteroperabilityEndpoint.getTerminatedStateAccount(
				moduleContext,
				chainID,
			);
		});

		it('should call getInteroperabilityStore', async () => {
			expect(sidechainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext.getStore,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			expect(sidechainInteroperabilityStore.getTerminatedStateAccount).toHaveBeenCalled();
		});

		it('should return JSON format result', () => {
			expect(terminateStateAccountResult).toEqual(terminateStateAccountJSON);
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		let terminatedOutboxAccountResult: TerminatedOutboxAccountJSON;

		beforeEach(async () => {
			terminatedOutboxAccountResult = await sidechainInteroperabilityEndpoint.getTerminatedOutboxAccount(
				moduleContext,
				chainID,
			);
		});

		it('should call getInteroperabilityStore', async () => {
			expect(sidechainInteroperabilityEndpoint['getInteroperabilityStore']).toHaveBeenCalledWith(
				moduleContext.getStore,
			);
		});

		it('should call getTerminatedStateAccount', async () => {
			expect(sidechainInteroperabilityStore.getTerminatedOutboxAccount).toHaveBeenCalledWith(
				chainID,
			);
		});

		it('should return JSON format result', () => {
			expect(terminatedOutboxAccountResult).toEqual(terminatedOutboxAccountJSON);
		});
	});
});
