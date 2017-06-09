'use strict';

var _ = require('lodash');
var fs = require('fs');
var Q = require('q');

var chai = require('chai');
var expect = require('chai').expect;
var popsicle = require('popsicle');
var scClient = require('socketcluster-client');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var child_process = require('child_process');
var waitUntilBlockchainReady = require('../common/globalBefore').waitUntilBlockchainReady;

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

var testNodeConfigs = generateNodesConfig(10, SYNC_MODE.ALL_TO_FIRST, [0]);

function generateNodePeers (numOfPeers, syncMode, syncModeArgs) {
	syncModeArgs = syncModeArgs || SYNC_MODE_DEFAULT_ARGS;
	switch (syncMode) {
	case SYNC_MODE.RANDOM:
		var peersList = [];

		if (typeof syncModeArgs.PROBABILITY !== 'number') {
			throw new Error('Probability parameter not specified to random sync mode');
		}
		var isPickedWithProbability = function (n) {
			return !!n && Math.random() <= n;
		};

		return Array.apply(null, new Array(numOfPeers)).forEach(function (val, index) {
			if (isPickedWithProbability(syncModeArgs.PROBABILITY)) {
				peersList.push({
					ip: '127.0.0.1',
					port: 4000 + index
				});
			}
		});
		break;

	case SYNC_MODE.ALL_TO_FIRST:
		return [{
			ip: '127.0.0.1',
			port: 4001
		}];
		break;

	case SYNC_MODE.ALL_TO_GROUP:
		throw new Error('To implement');
		break;
	}
}

function generateNodesConfig (numOfPeers, syncMode, forgingNodesIndices) {
	return Array.apply(null, new Array(numOfPeers)).map(function (val, index) {
		return {
			ip: '127.0.0.1',
			port: 4000 + index,
			database: 'lisk_local_' + index,
			peers: {
				list: generateNodePeers(numOfPeers, syncMode)
			},
			forging: forgingNodesIndices.indexOf(index) !== -1
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
					' -h ' + (nodeConfig.port + 1000) +
					' -x ' + peersAsString(nodeConfig.peers.list) +
					' -d ' + nodeConfig.database,
			'env': {
				'NODE_ENV': 'test'
			},
			'error_file': './test/integration/logs/lisk-test-node-' + index + '.err.log',
			'out_file': './test/integration/logs/lisk-test-node-' + index + '.out.log'
		};

		if (!nodeConfig.forging) {
			nodePM2Config.args += ' -c ./test/integration/config.non-forge.json';
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
		version: '0.0.0a',
		nonce: 'ABCD'
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
		console.log(stdout);
		return cb(err);
	});
}

function runFunctionalTests (cb) {
	child_process.exec('npm run test-functional', {maxBuffer: require('buffer').kMaxLength - 1}, function (err, stdout) {
		console.log(stdout);
		return cb(err);
	});
}


function recreateDatabases (done) {
	var recreatedCnt = 0;
	testNodeConfigs.forEach(function (nodeConfig) {
		child_process.exec('dropdb ' + nodeConfig.database + ' && createdb ' + nodeConfig.database, function (err, stdout) {
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
		waitUntilBlockchainReady(nodeReadyCb, 20, 2000, 'http://' + testNodeConfig.ip + ':' + (testNodeConfig.port + 1000));
	});
});

var sockets = [];

describe('Peers mutual connections', function () {

	before(function (done) {
		var connectedTo = 0;
		var wampClient = new WAMPClient();
		//ToDo: more clever way for waiting until all test node being able to receive connections
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

	it('should return a list of peer mutually interconnected', function (done) {
		Q.all(sockets.map(function (socket) {
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

describe('propagation', function () {

	before(function (done) {
		runFunctionalTests(done);
	});

	describe('blocks', function () {

		var nodesBlocks;

		before(function (done) {
			Q.all(testNodeConfigs.map(function (testNodeConfig) {
				return popsicle.get({
					url: 'http://' + testNodeConfig.ip + ':' + (testNodeConfig.port + 1000) + '/api/blocks',
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
			Q.all(sockets.map(function (socket) {
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


after(function (done) {
	killTestNodes(done);
});
