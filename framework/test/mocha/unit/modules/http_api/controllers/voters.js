/*
 * Copyright © 2020 Lisk Foundation
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

'use strict';

const rewire = require('rewire');

const VotersController = rewire(
	'../../../../../../src/modules/http_api/controllers/voters',
);

describe('voters/api', () => {
	let storageStub;
	let mockAccount;
	let mockDelegate;

	const contextStub = {
		request: {
			swagger: {
				params: {
					address: {
						value: sinonSandbox.stub().returns({}),
					},
					publicKey: {
						value: sinonSandbox.stub().returns({}),
					},
					username: {
						value: sinonSandbox.stub().returns({}),
					},
					limit: {
						value: sinonSandbox.stub().returns({}),
					},
					offset: {
						value: sinonSandbox.stub().returns({}),
					},
					sort: {
						value: sinonSandbox.stub().returns({}),
					},
				},
			},
			query: {
				address: {
					value: sinonSandbox.stub().returns({}),
				},
				publicKey: {
					value: sinonSandbox.stub().returns({}),
				},
				username: {
					value: sinonSandbox.stub().returns({}),
				},
				limit: {
					value: sinonSandbox.stub().returns({}),
				},
				offset: {
					value: sinonSandbox.stub().returns({}),
				},
				sort: {
					value: sinonSandbox.stub().returns({}),
				},
			},
		},
	};

	beforeEach(done => {
		mockDelegate = {
			address: '17006850325033785322L',
			publicKey:
				'198cc4a80c22e77ef0950579e0316e875c07478cd1407368e671b4af9e5611a2',
			balance: '979900000000',
			nonce: '1',
			asset: {},
			votes: [],
			keys: {
				numberOfSignatures: 0,
				mandatoryKeys: [],
				optionalKeys: [],
			},
			delegate: {
				lastForgedHeight: 0,
				registeredHeight: 0,
				consecutiveMissedBlocks: 0,
				isBanned: false,
				pomHeights: [],
			},
			username: 'OneDelegate',
			totalVotesReceived: '1071000000000',
		};

		mockAccount = {
			address: '17006850325033785323L',
			publicKey:
				'198cc4a80c22e77ef0950579e0316e875c07478cd1407368e671b4af9e5611a2',
			balance: '979900000000',
			nonce: '1',
			asset: {},
			votes: [
				{
					amount: '10000000000',
					delegateAddress: '17006850325033785322L',
				},
			],
			keys: {
				numberOfSignatures: 0,
				mandatoryKeys: [],
				optionalKeys: [],
			},
			delegate: {
				lastForgedHeight: 0,
				registeredHeight: 0,
				consecutiveMissedBlocks: 0,
				isBanned: false,
				pomHeights: [],
			},
		};

		storageStub = {
			entities: {
				Account: {
					getOne: sinonSandbox.stub().resolves(mockAccount),
					get: sinonSandbox.stub().resolves([mockDelegate]),
				},
			},
		};

		new VotersController({
			components: {
				storage: storageStub,
			},
			config: {
				constants: {
					maxVotesPerAccount: 10,
				},
			},
		});

		done();
	});

	describe('getAccounts', () => {
		it('should return accounts with all properties', async () => {
			await VotersController.getVotes(contextStub, (err, res) => {
				expect(err).to.eql(null);

				const account = res.data;

				expect(account).to.have.property('address');
				expect(account).to.have.property('publicKey');
				expect(account).to.have.property('balance');
				expect(account).to.have.property('votes');
				expect(account.votes[0]).to.have.property('amount');
				expect(account.votes[0]).to.have.property('delegateAddress');
				expect(account.votes[0]).to.have.property('delegate');
				expect(account.votes[0].delegate).to.have.property('username');
				expect(account.votes[0].delegate).to.have.property(
					'totalVotesReceived',
				);
				expect(account.votes[0].delegate).to.have.property('delegate');
			});
		});
	});
});
