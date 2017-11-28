'use strict';

var _ = require('lodash');
var sinon = require('sinon');
var devConfig = require('../data/config.json');
var utils = require('./utils');
var setup = require('./setup');
var scenarios = require('./scenarios');

describe('given configurations for 10 nodes with address "127.0.0.1", WS ports 500[0-9] and HTTP ports 400[0-9] using separate databases', function () {

	var configurations;

	before(function () {
		utils.http.setVersion('1.0.0');
		configurations = _.range(10).map(function (index) {
			var devConfigCopy = _.cloneDeep(devConfig);
			devConfigCopy.ip = '127.0.0.1';
			devConfigCopy.port = 5000 + index;
			devConfigCopy.httpPort = 4000 + index;
			return devConfigCopy;
		});
	});

	describe('when every peers contains the others on the peers list', function () {

		before(function () {
			configurations.forEach(function (configuration) {
				configuration.peers.list = setup.sync.generatePeers(configurations, setup.sync.SYNC_MODES.ALL_TO_GROUP, {indices: _.range(10)});
			});
		});

		describe('when every peer forges with separate subset of genesis delegates and forging.force = false', function () {

			before(function () {
				var secretsMaxLength = Math.ceil(devConfig.forging.secret.length / configurations.length);
				var secrets = _.clone(devConfig.forging.secret);

				configurations.forEach(function (configuration, index) {
					configuration.forging.force = false;
					configuration.forging.secret = secrets.slice(index * secretsMaxLength, (index + 1) * secretsMaxLength);
				});
			});

			describe('when network is set up', function () {

				before(function (done) {
					setup.setupNetwork(configurations, done);
				});

				after(function (done) {
					setup.exit(done);
				});

				describe('when WS connections to all nodes all established', function () {

					var params = {};

					before(function (done) {
						utils.ws.establishWSConnectionsToNodes(configurations, function (err, socketsResult) {
							if (err) {
								return done(err);
							}
							params.sockets = socketsResult;
							params.configurations = configurations;
							done();
						});
					});

					scenarios.network.peers(params);

					describe('when functional tests are successfully executed against 127.0.0.1:5000', function () {

						before(function (done) {
							setup.shell.runMochaTests(['test/functional/http/get/blocks.js', 'test/functional/http/get/transactions.js'], done);
						});

						scenarios.propagation.blocks(params);

						scenarios.propagation.transactions(params);
					});
				});
			});
		});
	});
});
