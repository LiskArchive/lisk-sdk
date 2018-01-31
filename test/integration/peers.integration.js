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

var async = require('async');
var child_process = require('child_process');
var fs = require('fs');
var popsicle = require('popsicle');
var Promise = require('bluebird');
var scClient = require('socketcluster-client');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');

var baseConfig = require('../data/config.json');

var blockchainReady = require('../common/utils/wait_for').blockchainReady;
var WSServerMaster = require('../common/ws/server_master');

var Logger = require('../../logger');
var logger = new Logger({
	filename: 'integrationTestsLogger.logs',
	echo: 'log',
});

var SYNC_MODE = {
	RANDOM: 0,
	ALL_TO_FIRST: 1,
	ALL_TO_GROUP: 2,
};

var SYNC_MODE_DEFAULT_ARGS = {
	RANDOM: {
		PROBABILITY: 0.5, // range 0 - 1
	},
	ALL_TO_GROUP: {
		INDICES: [],
	},
};

var WAIT_BEFORE_CONNECT_MS = 60000;

SYNC_MODE_DEFAULT_ARGS.ALL_TO_GROUP.INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
var testNodeConfigs = generateNodesConfig(10, SYNC_MODE.ALL_TO_GROUP, [
	0,
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	8,
	9,
]);

var monitorWSClient = {
	protocol: 'http',
	hostname: '127.0.0.1',
	wsPort: 'toOverwrite',
	autoReconnect: true,
	query: WSServerMaster.generatePeerHeaders(),
};

monitorWSClient.query.wsPort = 9999;

function generateNodePeers(numOfPeers, syncMode, syncModeArgs) {
	syncModeArgs = syncModeArgs || SYNC_MODE_DEFAULT_ARGS;

	var peersList = [];
	switch (syncMode) {
		case SYNC_MODE.RANDOM:
			if (typeof syncModeArgs.RANDOM.PROBABILITY !== 'number') {
				throw new Error(
					'Probability parameter not specified to random sync mode'
				);
			}
			var isPickedWithProbability = function(n) {
				return !!n && Math.random() <= n;
			};

			Array(...new Array(numOfPeers)).forEach((val, index) => {
				if (isPickedWithProbability(syncModeArgs.RANDOM.PROBABILITY)) {
					peersList.push({
						ip: '127.0.0.1',
						wsPort: 5000 + index,
					});
				}
			});
			break;

		case SYNC_MODE.ALL_TO_FIRST:
			peersList = [
				{
					ip: '127.0.0.1',
					wsPort: 5001,
				},
			];
			break;

		case SYNC_MODE.ALL_TO_GROUP:
			if (!Array.isArray(syncModeArgs.ALL_TO_GROUP.INDICES)) {
				throw new Error('Provide peers indices to sync with as an array');
			}
			Array(...new Array(numOfPeers)).forEach((val, index) => {
				if (syncModeArgs.ALL_TO_GROUP.INDICES.indexOf(index) !== -1) {
					peersList.push({
						ip: '127.0.0.1',
						wsPort: 5000 + index,
					});
				}
			});
	}
	return peersList;
}

function generateNodesConfig(numOfPeers, syncMode, forgingNodesIndices) {
	var secretsInChunk = Math.ceil(
		baseConfig.forging.secret.length / forgingNodesIndices.length
	);
	var secretsChunks = forgingNodesIndices.map((val, index) => {
		return baseConfig.forging.secret.slice(
			index * secretsInChunk,
			(index + 1) * secretsInChunk
		);
	});

	return Array(...new Array(numOfPeers)).map((val, index) => {
		var isForging = forgingNodesIndices.indexOf(index) !== -1;
		return {
			ip: '127.0.0.1',
			wsPort: 5000 + index,
			database: `lisk_local_${index}`,
			peers: {
				list: generateNodePeers(numOfPeers, syncMode),
			},
			forging: isForging,
			secrets: isForging ? secretsChunks[index] : [],
		};
	});
}

function generatePM2NodesConfig(testNodeConfigs) {
	var pm2Config = {
		apps: [],
	};

	function insertNewNode(index, nodeConfig) {
		function peersAsString(peersList) {
			return peersList
				.reduce((acc, peer) => {
					acc += `${peer.ip}:${peer.wsPort},`;
					return acc;
				}, '')
				.slice(0, -1);
		}

		var nodePM2Config = {
			exec_mode: 'fork',
			script: 'app.js',
			name: `node_${index}`,
			args: ` -p ${nodeConfig.wsPort} -h ${nodeConfig.wsPort -
				1000} -x ${peersAsString(nodeConfig.peers.list)} -d ${
				nodeConfig.database
			}`,
			env: {
				NODE_ENV: 'test',
			},
			error_file: `./test/integration/logs/lisk-test-node-${index}.err.log`,
			out_file: `./test/integration/logs/lisk-test-node-${index}.out.log`,
		};

		if (!nodeConfig.forging) {
			nodePM2Config.args +=
				' -c ./test/integration/configs/config.non-forge.json';
		} else {
			var currentNodeConfig = _.clone(baseConfig);
			currentNodeConfig.forging.force = false;
			currentNodeConfig.forging.secret = nodeConfig.secrets;
			fs.writeFileSync(
				`${__dirname}/configs/config.node-${index}.json`,
				JSON.stringify(currentNodeConfig, null, 4)
			);
			nodePM2Config.args += ` -c ./test/integration/configs/config.node-${index}.json`;
		}
		pm2Config.apps.push(nodePM2Config);
	}

	testNodeConfigs.forEach((testNodeConfig, index) => {
		insertNewNode(index, testNodeConfig);
	});

	fs.writeFileSync(
		`${__dirname}/pm2.integration.json`,
		JSON.stringify(pm2Config, null, 4)
	);
}

function clearLogs(cb) {
	child_process.exec('rm -rf test/integration/logs/*', err => {
		return cb(err);
	});
}

function launchTestNodes(cb) {
	child_process.exec(
		'node_modules/.bin/pm2 start test/integration/pm2.integration.json',
		err => {
			return cb(err);
		}
	);
}

function killTestNodes(cb) {
	child_process.exec('node_modules/.bin/pm2 delete all', err => {
		return cb(err);
	});
}

function runFunctionalTests(cb) {
	var child = child_process.spawn(
		'node_modules/.bin/_mocha',
		[
			'--timeout',
			(8 * 60 * 1000).toString(),
			'--exit',
			'test/functional/http/get/blocks.js',
			'test/functional/http/get/transactions.js',
		],
		{
			cwd: `${__dirname}/../..`,
		}
	);

	child.stdout.pipe(process.stdout);

	child.on('close', code => {
		if (code === 0) {
			return cb();
		} else {
			return cb('Functional tests failed');
		}
	});

	child.on('error', err => {
		return cb(err);
	});
}

function recreateDatabases(done) {
	async.forEachOf(
		testNodeConfigs,
		(nodeConfig, index, eachCb) => {
			child_process.exec(
				`dropdb ${nodeConfig.database}; createdb ${nodeConfig.database}`,
				eachCb
			);
		},
		done
	);
}

function enableForgingOnDelegates(done) {
	var enableForgingPromises = [];

	testNodeConfigs.forEach(testNodeConfig => {
		testNodeConfig.secrets.forEach(keys => {
			var enableForgingPromise = popsicle.put({
				url: `http://${testNodeConfig.ip}:${testNodeConfig.wsPort -
					1000}/api/node/status/forging`,
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
				body: {
					decryptionKey: 'elephant tree paris dragon chair galaxy',
					publicKey: keys.publicKey,
				},
			});
			enableForgingPromises.push(enableForgingPromise);
		});
	});
	Promise.all(enableForgingPromises)
		.then(() => {
			done();
		})
		.catch(() => {
			done('Failed to enable forging on delegates');
		});
}

function waitForAllNodesToBeReady(done) {
	async.forEachOf(
		testNodeConfigs,
		(nodeConfig, index, eachCb) => {
			blockchainReady(
				eachCb,
				20,
				2000,
				`http://${nodeConfig.ip}:${nodeConfig.wsPort - 1000}`
			);
		},
		done
	);
}

function establishWSConnectionsToNodes(sockets, done) {
	var connectedTo = 0;
	var wampClient = new WAMPClient();

	setTimeout(() => {
		testNodeConfigs.forEach(testNodeConfig => {
			monitorWSClient.wsPort = testNodeConfig.wsPort;
			var socket = scClient.connect(monitorWSClient);
			wampClient.upgradeToWAMP(socket);
			socket.on('connect', () => {
				sockets.push(socket);
				connectedTo += 1;
				if (connectedTo === testNodeConfigs.length) {
					done();
				}
			});
			socket.on('error', () => {});
			socket.on('connectAbort', () => {
				done(
					`Unable to establish WS connection with ${testNodeConfig.ip}:${
						testNodeConfig.wsPort
					}`
				);
			});
		}, WAIT_BEFORE_CONNECT_MS);
	});
}

describe('integration', function() {
	var self = this;
	var sockets = [];
	generatePM2NodesConfig(testNodeConfigs);

	before(done => {
		async.series(
			[
				function(cbSeries) {
					clearLogs(cbSeries);
				},
				function(cbSeries) {
					recreateDatabases(cbSeries);
				},
				function(cbSeries) {
					launchTestNodes(cbSeries);
				},
				function(cbSeries) {
					waitForAllNodesToBeReady(cbSeries);
				},
				function(cbSeries) {
					enableForgingOnDelegates(cbSeries);
				},
				function(cbSeries) {
					establishWSConnectionsToNodes(sockets, cbSeries);
					self.timeout(WAIT_BEFORE_CONNECT_MS * 2);
				},
			],
			done
		);
	});

	after(done => {
		killTestNodes(done);
	});

	describe('Peers mutual connections', () => {
		it('should return a list of peer mutually interconnected', () => {
			return Promise.all(
				sockets.map(socket => {
					return socket.wampSend('list', {});
				})
			).then(results => {
				results.forEach(result => {
					expect(result).to.have.property('success').to.be.ok;
					expect(result)
						.to.have.property('peers')
						.to.be.a('array');
					var peerPorts = result.peers.map(p => {
						return p.wsPort;
					});
					var allPeerPorts = testNodeConfigs.map(testNodeConfig => {
						return testNodeConfig.wsPort;
					});
					expect(_.intersection(allPeerPorts, peerPorts)).to.be.an('array').and
						.not.to.be.empty;
				});
			});
		});
	});

	describe('forging', () => {
		function getNetworkStatus(cb) {
			Promise.all(
				sockets.map(socket => {
					return socket.wampSend('status');
				})
			)
				.then(results => {
					var maxHeight = 1;
					var heightSum = 0;
					results.forEach(result => {
						expect(result).to.have.property('success').to.be.ok;
						expect(result)
							.to.have.property('height')
							.to.be.a('number');
						if (result.height > maxHeight) {
							maxHeight = result.height;
						}
						heightSum += result.height;
					});
					return cb(null, {
						height: maxHeight,
						averageHeight: heightSum / results.length,
					});
				})
				.catch(err => {
					cb(err);
				});
		}

		before(done => {
			// Expect some blocks to forge after 30 seconds
			var timesToCheckNetworkStatus = 30;
			var timesNetworkStatusChecked = 0;
			var checkNetworkStatusInterval = 1000;

			var checkingInterval = setInterval(() => {
				getNetworkStatus((err, res) => {
					timesNetworkStatusChecked += 1;
					if (err) {
						clearInterval(checkingInterval);
						return done(err);
					}
					logger.log(
						`network status: height - ${res.height}, average height - ${
							res.averageHeight
						}`
					);
					if (timesNetworkStatusChecked === timesToCheckNetworkStatus) {
						clearInterval(checkingInterval);
						return done(null, res);
					}
				});
			}, checkNetworkStatusInterval);
		});

		describe('network status after 30 seconds', () => {
			var getNetworkStatusError;
			var networkHeight;
			var networkAverageHeight;

			before(done => {
				getNetworkStatus((err, res) => {
					getNetworkStatusError = err;
					networkHeight = res.height;
					networkAverageHeight = res.averageHeight;
					done();
				});
			});

			it('should have no error', () => {
				expect(getNetworkStatusError).not.to.exist;
			});

			it('should have height > 1', () => {
				expect(networkHeight).to.be.above(1);
			});

			it('should have average height above 1', () => {
				expect(networkAverageHeight).to.be.above(1);
			});

			it('should have different peers heights propagated correctly on peers lists', () => {
				return Promise.all(
					sockets.map(socket => {
						return socket.wampSend('list');
					})
				).then(results => {
					expect(
						results.some(peersList => {
							return peersList.peers.some(peer => {
								return peer.height > 1;
							});
						})
					);
				});
			});
		});
	});

	describe('propagation', () => {
		before(done => {
			runFunctionalTests(done);
		});

		describe('blocks', () => {
			var nodesBlocks;

			before(() => {
				return Promise.all(
					testNodeConfigs.map(testNodeConfig => {
						return popsicle.get({
							url: `http://${testNodeConfig.ip}:${testNodeConfig.wsPort -
								1000}/api/blocks`,
							headers: {
								Accept: 'application/json',
								'Content-Type': 'application/json',
							},
						});
					})
				).then(results => {
					nodesBlocks = results.map(res => {
						return JSON.parse(res.body).data;
					});
					expect(nodesBlocks).to.have.lengthOf(testNodeConfigs.length);
				});
			});

			it('should contain non empty blocks after running functional tests', () => {
				nodesBlocks.forEach(blocks => {
					expect(blocks).to.be.an('array').and.not.empty;
				});
			});

			it('should have all peers at the same height', () => {
				var uniquePeersHeights = _(nodesBlocks)
					.map('length')
					.uniq()
					.value();
				expect(uniquePeersHeights).to.have.lengthOf.at.least(1);
			});

			it('should have all blocks the same at all peers', () => {
				var patternBlocks = nodesBlocks[0];
				for (var i = 0; i < patternBlocks.length; i += 1) {
					for (var j = 1; j < nodesBlocks.length; j += 1) {
						expect(_.isEqual(nodesBlocks[j][i], patternBlocks[i]));
					}
				}
			});
		});

		describe('transactions', () => {
			var nodesTransactions = [];

			before(() => {
				return Promise.all(
					sockets.map(socket => {
						return socket.wampSend('blocks');
					})
				).then(results => {
					nodesTransactions = results.map(res => {
						return res.blocks;
					});
					expect(nodesTransactions).to.have.lengthOf(testNodeConfigs.length);
				});
			});

			it('should contain non empty transactions after running functional tests', () => {
				nodesTransactions.forEach(transactions => {
					expect(transactions).to.be.an('array').and.not.empty;
				});
			});

			it('should have all peers having same amount of confirmed transactions', () => {
				var uniquePeersTransactionsNumber = _(nodesTransactions)
					.map('length')
					.uniq()
					.value();
				expect(uniquePeersTransactionsNumber).to.have.lengthOf.at.least(1);
			});

			it('should have all transactions the same at all peers', () => {
				var patternTransactions = nodesTransactions[0];
				for (var i = 0; i < patternTransactions.length; i += 1) {
					for (var j = 1; j < nodesTransactions.length; j += 1) {
						expect(_.isEqual(nodesTransactions[j][i], patternTransactions[i]));
					}
				}
			});
		});
	});
});
