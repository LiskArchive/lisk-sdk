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

var express = require('express');
var rewire  = require('rewire');

var jobsQueue = require('../../../helpers/jobsQueue');
var modulesLoader = require('../../common/modulesLoader');
var swaggerHelper = require('../../../helpers/swagger');

describe('loader', function () {

	var loaderModule;
	var blocksModuleMock;

	before(function (done) {
		var loaderModuleRewired = rewire('../../../modules/loader');
		blocksModuleMock = {
			lastBlock: {
				get: function () {}
			}
		};

		swaggerHelper.getResolvedSwaggerSpec().then(function (resolvedSwaggerSpec) {
			modulesLoader.initModule(
				loaderModuleRewired,
				_.assign({}, modulesLoader.scope, {
					logic: {
						transaction: sinonSandbox.mock(),
						account: sinonSandbox.mock(),
						peers: {
							create: sinonSandbox.stub().returnsArg(0)
						}
					}
				}),
				function (err, __loaderModule) {
					if (err) {
						return done(err);
					}
					loaderModule = __loaderModule;
					sinonSandbox.stub(loaderModuleRewired.__get__('__private'), 'loadBlockChain');
					loaderModule.onBind({
						blocks: blocksModuleMock,
						swagger: {
							definitions: resolvedSwaggerSpec.definitions
						}
					});
					done();
				});
		});
	});

	describe('findGoodPeers', function () {

		var HEIGHT_TWO = 2;

		beforeEach(function () {
			sinonSandbox.stub(blocksModuleMock.lastBlock, 'get').returns({height: HEIGHT_TWO});
		});

		it('should return peers list sorted by height', function () {

			var peers = [
				{
					ip: '1.1.1.1',
					wsPort: '4000',
					height: 1
				},
				{
					ip: '4.4.4.4',
					wsPort: '4000',
					height: 4
				},
				{
					ip: '3.3.3.3',
					wsPort: '4000',
					height: 3
				},
				{
					ip: '2.2.2.2',
					wsPort: '4000',
					height: 2
				}
			];

			var goodPeers = loaderModule.findGoodPeers(peers);
			expect(goodPeers).to.have.property('height').equal(HEIGHT_TWO); // Good peers - above my height (above and equal 2)
			expect(goodPeers).to.have.property('peers').to.be.an('array').to.have.lengthOf(3);
			expect(_.isEqualWith(goodPeers.peers, [
				{
					ip: '4.4.4.4',
					wsPort: '4000',
					height: 4
				},
				{
					ip: '3.3.3.3',
					wsPort: '4000',
					height: 3
				},
				{
					ip: '2.2.2.2',
					wsPort: '4000',
					height: 2
				}
			], function (a, b) {
				return a.ip === b.ip &&  a.wsPort === b.wsPort &&  a.height === b.height;
			})).to.be.ok;
		});
	});
});
