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
import {
	BLS_PUBLIC_KEY_LENGTH,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
} from '../../../../src/modules/interoperability/constants';
import { ChainAccountStore } from '../../../../src/modules/interoperability/stores/chain_account';
import { ChainValidatorsStore } from '../../../../src/modules/interoperability/stores/chain_validators';
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
	ChainValidators,
	ChainValidatorsJSON,
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

	const chainValidatorsMock = {
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
		minReturnFeePerByte: MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
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
		minReturnFeePerByte: channelData.minReturnFeePerByte.toString(),
	};

	const terminateStateAccount: TerminatedStateAccount = {
		stateRoot: utils.getRandomBytes(32),
		initialized: true,
		mainchainStateRoot: utils.getRandomBytes(32),
	};

	const terminatedStateAccountJSON: TerminatedStateAccountJSON = {
		stateRoot: terminateStateAccount.stateRoot.toString('hex'),
		initialized: terminateStateAccount.initialized,
		mainchainStateRoot: terminateStateAccount.mainchainStateRoot.toString('hex'),
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

	let testInteroperabilityEndpoint: TestEndpoint;

	beforeEach(() => {
		const stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		moduleContext = {
			getStore: (p1: Buffer, p2: Buffer) => stateStore.getStore(p1, p2),
			getImmutableMethodContext: jest.fn(),
			getOffchainStore: jest.fn(),
			chainID: Buffer.alloc(0),
			params: { chainID: '00000001' },
			logger: {} as any,
			header: { aggregateCommit: { height: 10 }, height: 12, timestamp: Date.now() },
		};
		testInteroperabilityEndpoint = new TestEndpoint(interopMod.stores, interopMod.offchainStores);

		interopMod.stores.register(ChainAccountStore, chainAccountStoreMock as never);
		interopMod.stores.register(ChannelDataStore, channelStoreMock as never);
		interopMod.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);
		interopMod.stores.register(TerminatedStateStore, terminatedStateAccountStoreMock as never);
		interopMod.stores.register(TerminatedOutboxStore, terminatedOutboxAccountMock as never);
		interopMod.stores.register(ChainValidatorsStore, chainValidatorsMock as never);

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
			chainAccountResult = await testInteroperabilityEndpoint.getChainAccount(moduleContext);
		});

		it('should call getChainAccount', () => {
			expect(chainAccountStoreMock.get).toHaveBeenCalledWith(expect.anything(), chainID);
		});

		it('should return JSON format result', () => {
			expect(chainAccountResult).toEqual(chainAccountJSON);
		});
	});

	describe('getAllChainAccounts', () => {
		let chainAccountResults: ChainAccountJSON[];

		beforeEach(async () => {
			({ chains: chainAccountResults } = await testInteroperabilityEndpoint.getAllChainAccounts(
				moduleContext,
			));
		});

		it('should return JSON format result', () => {
			expect(chainAccountResults).toEqual([chainAccountJSON, chainAccount2JSON]);
		});
	});

	describe('getChannel', () => {
		let channelDataResult: ChannelDataJSON;

		beforeEach(async () => {
			channelDataResult = await testInteroperabilityEndpoint.getChannel(moduleContext);
		});

		it('should call getChannel', () => {
			expect(channelStoreMock.get).toHaveBeenCalledWith(expect.anything(), chainID);
		});

		it('should return JSON format result', () => {
			expect(channelDataResult).toEqual(channelDataJSON);
		});
	});

	describe('getOwnChainAccount', () => {
		let ownChainAccountResult: OwnChainAccountJSON;

		beforeEach(async () => {
			ownChainAccountResult = await testInteroperabilityEndpoint.getOwnChainAccount(moduleContext);
		});

		it('should call getOwnChainAccount', () => {
			expect(ownChainAccountStoreMock.get).toHaveBeenCalled();
		});

		it('should return JSON format result', () => {
			expect(ownChainAccountResult).toEqual(ownChainAccountJSON);
		});
	});

	describe('getTerminatedStateAccount', () => {
		let terminatedStateAccountResult: TerminatedStateAccountJSON;

		beforeEach(async () => {
			terminatedStateAccountResult = await testInteroperabilityEndpoint.getTerminatedStateAccount(
				moduleContext,
			);
		});

		it('should call getTerminatedStateAccount', () => {
			expect(terminatedStateAccountStoreMock.get).toHaveBeenCalled();
		});

		it('should return JSON format result', () => {
			expect(terminatedStateAccountResult).toEqual(terminatedStateAccountJSON);
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		let terminatedOutboxAccountResult: TerminatedOutboxAccountJSON;

		beforeEach(async () => {
			terminatedOutboxAccountResult = await testInteroperabilityEndpoint.getTerminatedOutboxAccount(
				moduleContext,
			);
		});

		it('should call getTerminatedStateAccount', () => {
			expect(terminatedOutboxAccountMock.get).toHaveBeenCalledWith(expect.anything(), chainID);
		});

		it('should return JSON format result', () => {
			expect(terminatedOutboxAccountResult).toEqual(terminatedOutboxAccountJSON);
		});
	});

	describe('getChainValidators', () => {
		const mainchainThreshold = 68;
		const chainValidators: ChainValidators = {
			activeValidators: new Array(11).fill(0).map(() => ({
				blsKey: utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
				bftWeight: BigInt(1),
			})),
			certificateThreshold: BigInt(mainchainThreshold),
		};

		const chainValidatorsJSON: ChainValidatorsJSON = {
			activeValidators: chainValidators.activeValidators.map(validator => ({
				blsKey: validator.blsKey.toString('hex'),
				bftWeight: validator.bftWeight.toString(),
			})),
			certificateThreshold: chainValidators.certificateThreshold.toString(),
		};

		describe('when chain ID exists', () => {
			let chainValidatorsResult: ChainValidatorsJSON;

			beforeEach(async () => {
				chainAccountStoreMock.has.mockResolvedValue(true);
				chainValidatorsMock.get.mockResolvedValue(chainValidators);
				chainValidatorsResult = await testInteroperabilityEndpoint.getChainValidators(
					moduleContext,
				);
			});

			it('should call getTerminatedStateAccount', () => {
				expect(chainValidatorsMock.get).toHaveBeenCalledWith(expect.anything(), chainID);
			});

			it('should return JSON format result', () => {
				expect(chainValidatorsResult).toEqual(chainValidatorsJSON);
			});
		});

		describe('when chain ID doesnt exists', () => {
			it('should throw error when chain id does not exist', async () => {
				chainAccountStoreMock.has.mockResolvedValue(false);
				chainValidatorsMock.get.mockResolvedValue(chainValidators);

				await expect(
					testInteroperabilityEndpoint.getChainValidators(moduleContext),
				).rejects.toThrow('Chain account does not exist.');
			});
		});
	});
});
