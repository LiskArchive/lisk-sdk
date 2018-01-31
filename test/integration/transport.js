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

var devConfig = require('../data/config.json');

var utils = require('./utils');
var setup = require('./setup');
var scenarios = require('./scenarios');

describe('given configurations for 10 nodes with address "127.0.0.1", WS ports 500[0-9] and HTTP ports 400[0-9] using separate databases', () => {
	var configurations;

	before(() => {
		utils.http.setVersion('1.0.0');
		configurations = _.range(10).map(index => {
			var devConfigCopy = _.cloneDeep(devConfig);
			devConfigCopy.ip = '127.0.0.1';
			devConfigCopy.wsPort = 5000 + index;
			devConfigCopy.httpPort = 4000 + index;
			return devConfigCopy;
		});
	});

	describe('when every peers contains the others on the peers list', () => {
		before(() => {
			configurations.forEach(configuration => {
				configuration.peers.list = setup.sync.generatePeers(
					configurations,
					setup.sync.SYNC_MODES.ALL_TO_GROUP,
					{ indices: _.range(10) }
				);
			});
		});

		describe('when every peer forges with separate subset of genesis delegates and forging.force = false', () => {
			var testFailedError;

			before(() => {
				var secretsMaxLength = Math.ceil(
					devConfig.forging.secret.length / configurations.length
				);
				var secrets = _.clone(devConfig.forging.secret);

				configurations.forEach((configuration, index) => {
					configuration.forging.force = false;
					configuration.forging.secret = secrets.slice(
						index * secretsMaxLength,
						(index + 1) * secretsMaxLength
					);
				});
			});

			describe('when network is set up', () => {
				before(done => {
					setup.setupNetwork(configurations, done);
				});

				afterEach(function() {
					if (this.currentTest.state === 'failed') {
						console.warn(`Test failed: ${this.currentTest.title}`);
						testFailedError = this.currentTest.err;
					}
				});

				after(done => {
					setup.exit(() => {
						done(testFailedError);
					});
				});

				describe('when WS connections to all nodes all established', () => {
					var params = {};

					before(done => {
						utils.ws.establishWSConnectionsToNodes(
							configurations,
							(err, socketsResult) => {
								if (err) {
									return done(err);
								}
								params.sockets = socketsResult;
								params.configurations = configurations;
								done();
							}
						);
					});

					scenarios.network.peers(params);

					describe('when functional tests are successfully executed against 127.0.0.1:5000', () => {
						before(done => {
							setup.shell.runMochaTests(
								[
									'test/functional/http/get/blocks.js',
									'test/functional/http/get/transactions.js',
								],
								done
							);
						});

						scenarios.propagation.blocks(params);

						scenarios.propagation.transactions(params);

						scenarios.stress.transfer(params);
					});
				});
			});
		});
	});
});
