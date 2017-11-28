'use strict';

var genesisDelegates = require('../../data/genesisDelegates.json');
var modulesLoader = require('./../../common/modulesLoader');
var node = require('./../../node.js');
var expect = require('chai').expect;
var application = require('../../common/application.js');

describe('node', function () {

	var testDelegate = genesisDelegates.delegates[0];

	var library;
	var __private;

	var db;

	before(function (done) {
		application.init({sandbox: {name: 'lisk_test_modules_node'}}, function (err, scope) {
			library = scope;
			// Set delegates module as loaded to allow manual forging
			library.rewiredModules.delegates.__set__('__private.loaded', true);
			// Load forging delegates
			__private = library.rewiredModules.delegates.__get__('__private');
			done(err);
		});
	});

	after(function (done) {
		application.cleanup(done);
	});

	describe('constructor', function () {

		describe('library', function () {

			it('should assign build');

			it('should assign lastCommit');

			it('should assign config.version');

			it('should assign config.nethash');

			it('should assign config.nonce');
		});

		it('should assign blockReward');

		it('should assign blockReward with BlockReward instance');

		it('should call callback with error = null');

		it('should call callback with result as a Node instance');
	});

	describe('internal', function () {

		var node_module;

		before(function () {
			node_module = library.modules.node;
		});

		function updateForgingStatus (testDelegate, action, cb) {
			node_module.internal.getForgingStatus(testDelegate.publicKey, function (err, res) {
				if ((res[0].forging && action === 'disable') || (!res[0].forging && action === 'enable')) {
					node_module.internal.toggleForgingStatus(testDelegate.publicKey, testDelegate.key, cb);
				} else {
					cb(err, {
						publicKey: testDelegate.publicKey,
						key: testDelegate.key
					});
				}
			});
		}

		describe('toggleForgingStatus', function () {

			var defaultKey;

			before(function () {
				defaultKey = library.config.forging.defaultKey;
			});

			it('should return error with invalid key', function (done) {
				node_module.internal.toggleForgingStatus(testDelegate.publicKey, 'Invalid key', function (err) {
					expect(err).to.equal('Invalid key and public key combination');
					done();
				});
			});

			it('should return error with invalid publicKey', function (done) {
				var invalidPublicKey = '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';

				node_module.internal.toggleForgingStatus(invalidPublicKey, defaultKey, function (err) {
					expect(err).equal('Delegate with publicKey: 9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a not found');
					done();
				});
			});

			it('should return error with non delegate account', function (done) {
				node_module.internal.toggleForgingStatus(node.gAccount.publicKey, node.gAccount.password, function (err) {
					expect(err).equal('Delegate with publicKey: c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f not found');
					done();
				});
			});

			it('should toggle forging from enabled to disabled', function (done) {
				updateForgingStatus(testDelegate, 'enable', function (err) {
					expect(err).to.not.exist;

					node_module.internal.toggleForgingStatus(testDelegate.publicKey, defaultKey, function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.eql({
							publicKey: testDelegate.publicKey,
							forging: false
						});
						done();
					});
				});
			});

			it('should toggle forging from disabled to enabled', function (done) {
				updateForgingStatus(testDelegate, 'disable', function (err) {
					expect(err).to.not.exist;

					node_module.internal.toggleForgingStatus(testDelegate.publicKey, defaultKey, function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.eql({
							publicKey: testDelegate.publicKey,
							forging: true
						});
						done();
					});
				});
			});
		});
	});

	describe('shared', function () {

		describe('getConstants', function () {

			describe('when loaded = false', function () {

				it('should call callback with error = "Blockchain is loading"');
			});

			describe('when loaded = true', function () {

				it('should call modules.blocks.lastBlock.get');

				it('should call callback with error = null');

				it('should call callback with result containing build = library.build');

				it('should call callback with result containing commit = library.commit');

				it('should call callback with result containing epoch = constants.epochTime');

				it('should call callback with result containing fees = constants.fees');

				it('should call callback with result containing nethash = library.config.nethash');

				it('should call callback with result containing nonce = library.config.nonce');

				it('should call callback with result containing milestone = blockReward.calcMilestone result');

				it('should call callback with result containing reward = blockReward.calcReward result');

				it('should call callback with result containing supply = blockReward.calcSupply result');

				it('should call callback with result containing version = library.config.version');
			});
		});

		describe('getStatus', function () {

			describe('when loaded = false', function () {

				it('should call callback with error = "Blockchain is loading"');
			});

			describe('when loaded = true', function () {

				it('should call callback with error = null');

				it('should call callback with result containing broadhash = modules.system.getBroadhash result');

				it('should call callback with result containing consensus = modules.peers.getConsensus result');

				it('should call callback with result containing height = modules.blocks.lastBlock.get result');

				it('should call callback with result containing syncing = modules.loader.syncing result');

				it('should call modules.loader.getNetwork');

				describe('when modules.loader.getNetwork fails', function () {

					it('should call callback with result containing networkHeight = null');
				});

				describe('when modules.loader.getNetwork succeeds and returns network', function () {

					it('should call callback with result containing networkHeight = network.height');
				});
			});
		});
	});

	describe('onBind', function () {

		describe('modules', function () {

			it('should assign blocks');

			it('should assign loader');

			it('should assign peers');

			it('should assign system');
		});

		it('should assign loaded = true');
	});
});
