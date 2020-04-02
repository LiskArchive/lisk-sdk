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

const AccountsController = rewire(
	'../../../../../../src/modules/http_api/controllers/accounts',
);

describe('accounts/api', () => {
	let storageStub;
	let channelStub;
	let mockAccount;
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
		mockAccount = {
			address: '17006850325033785322L',
			publicKey:
				'198cc4a80c22e77ef0950579e0316e875c07478cd1407368e671b4af9e5611a2',
			balance: '979900000000',
			nonce: '1',
			asset: {},
			votes: [
				{
					amount: '10000000000',
					delegateAddress: '10016685355739180605L',
				},
				{
					amount: '10000000000',
					delegateAddress: '10045031187186962062L',
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
					get: sinonSandbox.stub().resolves([mockAccount]),
				},
			},
		};

		channelStub = {
			invoke: sinonSandbox.stub().resolves({ height: 1 }),
		};

		new AccountsController({
			components: {
				storage: storageStub,
			},
			channel: channelStub,
		});

		done();
	});

	describe('constructor', () => {
		it('should assign storage', async () => {
			expect(AccountsController.__get__('storage')).to.equal(storageStub);
		});

		it('should assign channel', async () => {
			expect(AccountsController.__get__('channel')).to.equal(channelStub);
		});
	});

	describe('getAccounts', () => {
		it('should return accounts with all properties', async () => {
			await AccountsController.getAccounts(contextStub, (err, res) => {
				expect(err).to.eql(null);

				const account = res.data[0];
				expect(account).to.have.property('address');
				expect(account).to.have.property('publicKey');
				expect(account).to.have.property('balance');
				expect(account).to.have.property('nonce');
				expect(account).to.have.property('asset');
				expect(account).to.have.property('votes');
				expect(account).to.have.property('delegate');
			});
		});
	});
});
