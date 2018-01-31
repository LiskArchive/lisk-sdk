/*
 * Copyright © 2018 Lisk Foundation
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

var rewire = require('rewire');

var modulesLoader = require('../../common/modules_loader');
var swaggerHelper = require('../../../helpers/swagger');

describe('loader', () => {
	var loaderModule;
	var blocksModuleMock;
	var loadBlockChainStub;

	before(done => {
		var loaderModuleRewired = rewire('../../../modules/loader');
		blocksModuleMock = {
			lastBlock: {
				get: function() {},
			},
		};

		swaggerHelper.getResolvedSwaggerSpec().then(resolvedSwaggerSpec => {
			modulesLoader.initModule(
				loaderModuleRewired,
				_.assign({}, modulesLoader.scope, {
					logic: {
						transaction: sinonSandbox.mock(),
						account: sinonSandbox.mock(),
						peers: {
							create: sinonSandbox.stub().returnsArg(0),
						},
					},
				}),
				(err, __loaderModule) => {
					if (err) {
						return done(err);
					}
					loaderModule = __loaderModule;
					loadBlockChainStub = sinonSandbox.stub(
						loaderModuleRewired.__get__('__private'),
						'loadBlockChain'
					);
					loaderModule.onBind({
						blocks: blocksModuleMock,
						swagger: {
							definitions: resolvedSwaggerSpec.definitions,
						},
					});
					done();
				}
			);
		});

		after(() => {
			loadBlockChainStub.restore();
		});
	});

	describe('findGoodPeers', () => {
		var HEIGHT_TWO = 2;
		var getLastBlockStub;

		beforeEach(() => {
			getLastBlockStub = sinonSandbox
				.stub(blocksModuleMock.lastBlock, 'get')
				.returns({ height: HEIGHT_TWO });
		});

		afterEach(() => {
			getLastBlockStub.restore();
		});

		it('should return peers list sorted by height', () => {
			var peers = [
				{
					ip: '1.1.1.1',
					wsPort: '4000',
					height: 1,
				},
				{
					ip: '4.4.4.4',
					wsPort: '4000',
					height: 4,
				},
				{
					ip: '3.3.3.3',
					wsPort: '4000',
					height: 3,
				},
				{
					ip: '2.2.2.2',
					wsPort: '4000',
					height: 2,
				},
			];

			var goodPeers = loaderModule.findGoodPeers(peers);
			expect(goodPeers)
				.to.have.property('height')
				.equal(HEIGHT_TWO); // Good peers - above my height (above and equal 2)
			expect(goodPeers)
				.to.have.property('peers')
				.to.be.an('array')
				.to.have.lengthOf(3);
			expect(
				_.isEqualWith(
					goodPeers.peers,
					[
						{
							ip: '4.4.4.4',
							wsPort: '4000',
							height: 4,
						},
						{
							ip: '3.3.3.3',
							wsPort: '4000',
							height: 3,
						},
						{
							ip: '2.2.2.2',
							wsPort: '4000',
							height: 2,
						},
					],
					(a, b) => {
						return (
							a.ip === b.ip && a.wsPort === b.wsPort && a.height === b.height
						);
					}
				)
			).to.be.ok;
		});
	});
});
