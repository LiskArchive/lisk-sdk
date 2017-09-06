'use strict';
var _ = require('lodash');
var child_process = require('child_process');
var chai = require('chai');
var expect = require('chai').expect;
var fs = require('fs');
var popsicle = require('popsicle');
var Promise = require('bluebird');
var scClient = require('socketcluster-client');
var waitUntilBlockchainReady = require('../common/globalBefore').waitUntilBlockchainReady;
var WAMPClient = require('wamp-socket-cluster/WAMPClient');

var baseConfig = require('../../test/config.json');
var Logger = require('../../logger');

var SYNC_MODE = {
	RANDOM: 0,
	ALL_TO_FIRST: 1,
	ALL_TO_GROUP: 2
};

var SYNC_MODE_DEFAULT_ARGS = {
	RANDOM: {
		PROBABILITY: 0.5 //range 0 - 1
	},
	ALL_TO_GROUP: {
		INDICES: []
	}
};

var logger = new Logger({filename: 'integrationTests.logs', echo: 'log'});

var testNodeConfigs = generateNodesConfig(10, SYNC_MODE.ALL_TO_FIRST, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

function generateNodePeers (numOfPeers, syncMode, syncModeArgs) {
	syncModeArgs = syncModeArgs || SYNC_MODE_DEFAULT_ARGS;
	switch (syncMode) {
		case SYNC_MODE.RANDOM:
			var peersList = [];

			if (typeof syncModeArgs.RANDOM.PROBABILITY !== 'number') {
				throw new Error('Probability parameter not specified to random sync mode');
			}
			var isPickedWithProbability = function (n) {
				return !!n && Math.random() <= n;
			};

			return Array.apply(null, new Array(numOfPeers)).forEach(function (val, index) {
				if (isPickedWithProbability(syncModeArgs.RANDOM.PROBABILITY)) {
					peersList.push({
						ip: '127.0.0.1',
						port: 5000 + index
					});
				}
			});
			return peersList;
			break;

		case SYNC_MODE.ALL_TO_FIRST:
			return [{
				ip: '127.0.0.1',
				port: 5001
			}];
			break;

		case SYNC_MODE.ALL_TO_GROUP:
			throw new Error('To implement');
			break;
	}
}

function generateNodesConfig (numOfPeers, syncMode, forgingNodesIndices) {
	var secretsInChunk = Math.ceil(baseConfig.forging.secret.length / forgingNodesIndices.length);
	var secretsChunks = Array.apply(null, new Array(forgingNodesIndices.length)).map(function (val, index) {
		return baseConfig.forging.secret.slice(index * secretsInChunk, (index + 1) * secretsInChunk);
	});

	return Array.apply(null, new Array(numOfPeers)).map(function (val, index) {
		var isForging = forgingNodesIndices.indexOf(index) !== -1;
		return {
			ip: '127.0.0.1',
			port: 5000 + index,
			database: 'lisk_local_' + index,
			peers: {
				list: generateNodePeers(numOfPeers, syncMode)
			},
			forging: isForging,
			secrets: isForging ? secretsChunks[index] : []
		};
	});
}

function generatePM2NodesConfig (testNodeConfigs) {

	var pm2Config = {
		apps: []
	};

	function insertNewNode (index, nodeConfig) {

		function peersAsString (peersList) {
			return peersList.reduce(function (acc, peer) {
				acc += peer.ip + ':' + peer.port + ',';
				return acc;
			}, '').slice(0, -1);
		}

		var nodePM2Config = {
			'exec_mode': 'fork',
			'script': 'app.js',
			'name': 'node_' + index,
			'args': ' -p ' + nodeConfig.port +
			' -h ' + (nodeConfig.port - 1000) +
			' -x ' + peersAsString(nodeConfig.peers.list) +
			' -d ' + nodeConfig.database,
			'env': {
				'NODE_ENV': 'test'
			},
			'error_file': './test/integration/logs/lisk-test-node-' + index + '.err.log',
			'out_file': './test/integration/logs/lisk-test-node-' + index + '.out.log'
		};

		if (!nodeConfig.forging) {
			nodePM2Config.args += ' -c ./test/integration/configs/config.non-forge.json';
		} else {
			var currentNodeConfig = _.clone(baseConfig);
			currentNodeConfig.forging.force = true;
			currentNodeConfig.forging.secret = nodeConfig.secrets;
			fs.writeFileSync(__dirname + '/configs/config.node-' + index + '.json', JSON.stringify(currentNodeConfig, null, 4));
			nodePM2Config.args += ' -c ./test/integration/configs/config.node-' + index + '.json';
		}
		pm2Config.apps.push(nodePM2Config);
	}

	testNodeConfigs.forEach(function (testNodeConfig, index) {
		insertNewNode(index, testNodeConfig);
	});

	fs.writeFileSync(__dirname + '/pm2.integration.json', JSON.stringify(pm2Config, null, 4));
}

var monitorWSClient = {
	protocol: 'http',
	hostname: '127.0.0.1',
	port: 'toOverwrite',
	autoReconnect: true,
	query: {
		port: 9999,
		nethash: '198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d',
		broadhash: '198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d',
		height: 1,
		version: '0.0.0a',
		nonce: '0123456789ABCDEF'
	}
};

function clearLogs (cb) {
	child_process.exec('rm -rf test/integration/logs/*', function (err, stdout) {
		return cb(err);
	});
}

function launchTestNodes (cb) {
	child_process.exec('node_modules/.bin/pm2 start test/integration/pm2.integration.json', function (err, stdout) {
		return cb(err);
	});
}

function killTestNodes (cb) {
	child_process.exec('node_modules/.bin/pm2 delete all', function (err, stdout) {
		logger.log(stdout);
		return cb(err);
	});
}

function runFunctionalTests (cb) {
	var child = child_process.spawn('npm', ['run', 'test-functional'], {
		cwd: __dirname + '/../..'
	});

	child.stdout.pipe(process.stdout);

	child.on('close', function (code) {
		return cb(code === 0 ? undefined : code);
	});

	child.on('error', function (err) {
		return cb(err);
	});
}

function recreateDatabases (done) {
	var recreatedCnt = 0;
	testNodeConfigs.forEach(function (nodeConfig) {
		child_process.exec('dropdb ' + nodeConfig.database + '; createdb ' + nodeConfig.database, function (err, stdout) {
			if (err) {
				return done(err);
			}
			recreatedCnt += 1;
			if (recreatedCnt === testNodeConfigs.length) {
				done();
			}
		});
	});
}

describe('integration', function () {
	var sockets = [];
	before(function () {
		generatePM2NodesConfig(testNodeConfigs);
	});

	before(function (done) {
		clearLogs(done);
	});

	before(function (done) {
		recreateDatabases(done);
	});

	before(function (done) {
		launchTestNodes(done);
	});

	before(function (done) {

		var nodesReadyCnt = 0;
		var nodeReadyCb = function (err) {
			if (err) {
				return done(err);
			}
			nodesReadyCnt += 1;
			if (nodesReadyCnt === testNodeConfigs.length) {
				done();
			}
		};

		testNodeConfigs.forEach(function (testNodeConfig) {
			waitUntilBlockchainReady(nodeReadyCb, 20, 2000, 'http://' + testNodeConfig.ip + ':' + (testNodeConfig.port - 1000));
		});
	});

	after(function (done) {
		killTestNodes(done);
	});

	before(function (done) {
		var connectedTo = 0;
		var wampClient = new WAMPClient();
		//ToDo: find a better way for waiting until all test node being able to receive connections
		setTimeout(function () {
			testNodeConfigs.forEach(function (testNodeConfig) {
				monitorWSClient.port = testNodeConfig.port;
				var socket = scClient.connect(monitorWSClient);
				wampClient.upgradeToWAMP(socket);
				socket.on('connect', function () {
					sockets.push(socket);
					connectedTo += 1;
					if (connectedTo === testNodeConfigs.length) {
						done();
					}
				});
				socket.on('error', function (err) {});
				socket.on('connectAbort', function (err) {
					done('Unable to establish WS connection with ' + testNodeConfig.ip + ':' + testNodeConfig.port);
				});
			}, 1000);
		});
	});

	describe('Peers mutual connections', function () {

		it('should return a list of peer mutually interconnected', function (done) {
			Promise.all(sockets.map(function (socket) {
				return socket.wampSend('list');
			})).then(function (results) {
				var resultsFrom = 0;
				results.forEach(function (result) {
					resultsFrom += 1;
					expect(result).to.have.property('success').to.be.ok;
					expect(result).to.have.property('peers').to.be.a('array');
					var peerPorts = result.peers.map(function (p) {
						return p.port;
					});

					var allPeerPorts = testNodeConfigs.map(function (testNodeConfig) {
						return testNodeConfig.port;
					});

					expect(_.intersection(allPeerPorts, peerPorts)).to.be.an('array').and.not.to.be.empty;
					if (resultsFrom === testNodeConfigs.length) {
						done();
					}
				});

			}).catch(function (err) {
				done(err);
			});
		});
	});

	describe('forging', function () {

		function getNetworkStatus (cb) {
			Promise.all(sockets.map(function (socket) {
				return socket.wampSend('status');
			})).then(function (results) {
				var maxHeight = 1;
				var heightSum = 0;
				results.forEach(function (result) {
					expect(result).to.have.property('success').to.be.ok;
					expect(result).to.have.property('height').to.be.a('number');
					if (result.height > maxHeight) {
						maxHeight = result.height;
					}
					heightSum += result.height;
				});
				return cb(null, {
					height: maxHeight,
					averageHeight: heightSum / results.length
				});

			}).catch(function (err) {
				cb(err);
			});
		}

		before(function (done) {
			// Expect some blocks to forge after 30 seconds
			var timesToCheckNetworkStatus = 30;
			var timesNetworkStatusChecked = 0;
			var checkNetworkStatusInterval = 1000;

			var checkingInterval = setInterval(function () {
				getNetworkStatus(function (err, res) {
					timesNetworkStatusChecked += 1;
					if (err) {
						clearInterval(checkingInterval);
						return done(err);
					}
					logger.log('network status: height - ' + res.height + ', average height - ' + res.averageHeight);
					if (timesNetworkStatusChecked === timesToCheckNetworkStatus) {
						clearInterval(checkingInterval);
						return done(null, res);
					}
				});
			}, checkNetworkStatusInterval);
		});

		describe('network status after 30 seconds', function () {

			var getNetworkStatusError;
			var networkHeight;
			var networkAverageHeight;

			before(function (done) {
				getNetworkStatus(function (err, res) {
					getNetworkStatusError = err;
					networkHeight = res.height;
					networkAverageHeight = res.averageHeight;
					done();
				});
			});

			it('should have no error', function () {
				expect(getNetworkStatusError).not.to.exist;
			});

			it('should have height > 1', function () {
				expect(networkHeight).to.be.above(1);
			});

			it('should have average height above 1', function () {
				expect(networkAverageHeight).to.be.above(1);
			});

			it('should have different peers heights propagated correctly on peers lists', function (done) {
				Promise.all(sockets.map(function (socket) {
					return socket.wampSend('list');
				})).then(function (results) {
					expect(results.some(function (peersList) {
						return peersList.peers.some(function (peer) {
							return peer.height > 1;
						});
					}));
					done();
				}).catch(function (err) {
					done(err);
				});
			});
		});
	});

	describe('propagation', function () {

		before(function (done) {
			runFunctionalTests(done);
		});

		describe('blocks', function () {

			var nodesBlocks;

			before(function (done) {
				Promise.all(testNodeConfigs.map(function (testNodeConfig) {
					return popsicle.get({
						url: 'http://' + testNodeConfig.ip + ':' + (testNodeConfig.port - 1000) + '/api/blocks',
						headers: {
							'Accept': 'application/json',
							'ip': '0.0.0.0',
							'port': 9999,
							'nethash': '198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d',
							'version': '0.0.0a'
						}
					});
				})).then(function (results) {
					nodesBlocks = results.map(function (res) {
						return JSON.parse(res.body).blocks;
					});
					expect(nodesBlocks).to.have.lengthOf(testNodeConfigs.length);
					done();
				}).catch(function (err) {
					done(err);
				});
			});

			it('should contain non empty blocks after running functional tests', function () {
				nodesBlocks.forEach(function (blocks) {
					expect(blocks).to.be.an('array').and.not.empty;
				});
			});

			it('should have all peers at the same height', function () {
				var uniquePeersHeights = _(nodesBlocks).map('length').uniq().value();
				expect(uniquePeersHeights).to.have.lengthOf(1);
			});

			it('should have all blocks the same at all peers', function () {
				var patternBlocks = nodesBlocks[0];
				for (var i = 0; i < patternBlocks.length; i += 1) {
					for (var j = 1; j < nodesBlocks.length; j += 1) {
						expect(_.isEqual(nodesBlocks[j][i], patternBlocks[i]));
					}
				}
			});
		});

		describe('transactions', function () {

			var nodesTransactions = [];

			before(function (done) {
				Promise.all(sockets.map(function (socket) {
					return socket.wampSend('blocks');
				})).then(function (results) {
					nodesTransactions = results.map(function (res) {
						return res.blocks;
					});
					expect(nodesTransactions).to.have.lengthOf(testNodeConfigs.length);
					done();
				}).catch(function (err) {
					done(err);
				});
			});

			it('should contain non empty transactions after running functional tests', function () {
				nodesTransactions.forEach(function (transactions) {
					expect(transactions).to.be.an('array').and.not.empty;
				});
			});

			it('should have all peers having same amount of confirmed transactions', function () {
				var uniquePeersTransactionsNumber = _(nodesTransactions).map('length').uniq().value();
				expect(uniquePeersTransactionsNumber).to.have.lengthOf(1);
			});

			it('should have all transactions the same at all peers', function () {
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

