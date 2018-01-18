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
var sinon = require('sinon');
var chai = require('chai');
var expect = require('chai').expect;

var swaggerHelper = require('../../../helpers/swagger');

var modulesLoader = require('../../common/modulesLoader');
var TransportModule = rewire('../../../modules/transport.js');

describe('transport', function () {

	var dbStub, loggerStub, busStub, schemaStub, networkStub, balancesSequenceStub,
		transactionStub, blockStub, peersStub, broadcasterStubRef, transportInstance,
		library, __private, defaultScope;

	var restoreRewiredTopDeps;

	beforeEach(function (done) {
		// Recreate all the stubs and default structures before each test case to make
		// sure that they are fresh every time; that way each test case can modify
		// stubs without affecting other test cases.

		dbStub = {
			query: sinon.spy()
		};

		loggerStub = {
			debug: sinon.spy(),
			error: sinon.spy()
		};

		busStub = {};
		schemaStub = {};
		networkStub = {};
		balancesSequenceStub = {};

		transactionStub = {
			attachAssetType: sinon.stub()
		};

		blockStub = {};
		peersStub = {};

		restoreRewiredTopDeps = TransportModule.__set__({
			Broadcaster: function () {
				this.bind = function () {};
				broadcasterStubRef = this;
			}
		});

		defaultScope = {
			logic: {
				block: blockStub,
				transaction: transactionStub,
				peers: peersStub
			},
			db: dbStub,
			logger: loggerStub,
			bus: busStub,
			schema: schemaStub,
			network: networkStub,
			balancesSequence: balancesSequenceStub,
			config: {
				peers: {
					options: {
						timeout: 1234
					}
				},
				forging: {},
				broadcasts: {
					broadcastInterval: 10000,
					releaseLimit: 10
				}
			}
		};

		swaggerHelper.getResolvedSwaggerSpec().then(function (resolvedSpec) {
			defaultScope.swagger = {
				definitions: resolvedSpec.definitions
			};
			done();
		});
	});

	afterEach(function (done) {
		restoreRewiredTopDeps();
		done();
	});

	describe('Transport constructor', function () {

		describe('library', function () {

			it('should assign scope variables when instantiating', function (done) {
				var localTransportInstance = new TransportModule(function (err, transportSelf) {
					library = TransportModule.__get__('library');
					__private = TransportModule.__get__('__private');

					library.should.have.property('db').which.is.equal(dbStub);
					library.should.have.property('logger').which.is.equal(loggerStub);
					library.should.have.property('bus').which.is.equal(busStub);
					library.should.have.property('schema').which.is.equal(schemaStub);
					library.should.have.property('network').which.is.equal(networkStub);
					library.should.have.property('balancesSequence').which.is.equal(balancesSequenceStub);
					library.should.have.nested.property('logic.block').which.is.equal(blockStub);
					library.should.have.nested.property('logic.transaction').which.is.equal(transactionStub);
					library.should.have.nested.property('logic.peers').which.is.equal(peersStub);
					library.should.have.nested.property('config.peers.options.timeout').which.is.equal(1234);

					__private.should.have.property('broadcaster').which.is.equal(broadcasterStubRef);

					should.not.exist(err);
					transportSelf.should.equal(localTransportInstance);

					transportSelf.onBind(defaultScope);

					done();
				}, defaultScope);
			});
		});
	});

	describe('__private', function () {
		var libraryOriginal, __privateOriginal;

		beforeEach(function (done) {
			libraryOriginal = {};
			__privateOriginal = {};

			transportInstance = new TransportModule(function (err, transportSelf) {
				library = TransportModule.__get__('library');
				__private = TransportModule.__get__('__private');
				Object.keys(library).forEach(function (field) {
					libraryOriginal[field] = library[field];
				});
				Object.keys(__private).forEach(function (field) {
					__privateOriginal[field] = __private[field];
				});
				transportSelf.onBind(defaultScope);
				done();
			}, defaultScope);
		});

		afterEach(function (done) {
			// Reset __private and library module variables to their
			// original states.
			Object.keys(libraryOriginal).forEach(function (field) {
				library[field] = libraryOriginal[field];
			});
			Object.keys(__privateOriginal).forEach(function (field) {
				__private[field] = __privateOriginal[field];
			});
			done();
		});

		describe('removePeer', function () {

			describe('when options.peer is undefined', function () {

				it('should call library.logger.debug with "Cannot remove empty peer"', function (done) {
					__private.removePeer({}, 'Custom peer remove message');
					loggerStub.debug.called.should.be.true;
					loggerStub.debug.calledWith('Cannot remove empty peer').should.be.true;
					done();
				});

				it('should return false', function (done) {
					var result = __private.removePeer({}, 'Custom peer remove message');
					result.should.be.false;
					done();
				});
			});

			describe('when options.peer is defined', function () {

				var removeSpy, peerData;
				var restoreRewiredDeps;

				beforeEach(function (done) {
					removeSpy = sinon.spy();
					restoreRewiredDeps = TransportModule.__set__({
						modules: {
							peers: {
								remove: removeSpy
							}
						}
					});
					peerData = {
						ip: '127.0.0.1',
						wsPort: 8000
					};
					done();
				});

				afterEach(function (done) {
					restoreRewiredDeps();
					done();
				});

				it('should call library.logger.debug', function (done) {
					__private.removePeer({
						peer: peerData
					}, 'Custom peer remove message');
					loggerStub.debug.called.should.be.true;
					done();
				});

				it('should call modules.peers.remove with options.peer', function (done) {
					__private.removePeer({
						peer: peerData
					}, 'Custom peer remove message');
					removeSpy.calledWith(peerData).should.be.true;
					done();
				});
			});
		});

		describe('receiveSignatures', function () {

			beforeEach(function (done) {
				__private.receiveSignature = sinon.stub().callsArg(1);
				library.schema.validate = sinon.stub().callsArg(2);
				done();
			});

			it('should call library.schema.validate with empty query.signatures', function (done) {
				__private.receiveSignatures({
					signatures: []
				}, function (err) {
					library.schema.validate.called.should.be.true;
					done();
				});
			});

			it('should call library.schema.validate with query.signatures', function (done) {
				__private.receiveSignatures({
					signatures: ['SIGNATURE123', 'SIGNATURE456'] // TODO: Use realistic signatures
				}, function (err) {
					library.schema.validate.called.should.be.true;
					done();
				});
			});

			it('should call library.schema.validate with custom schema.signatures', function (done) {
				var restoreRewiredDeps = TransportModule.__set__({
					definitions: {
						Signature: {
							id: 'transport.signatures',
							type: 'object',
							properties: {
								signatures: {
									type: 'array',
									minItems: 1,
									maxItems: 40
								}
							},
							required: ['signatures']
						}
					}
				});

				__private.receiveSignatures({
					signatures: ['SIGNATURE123', 'SIGNATURE456']
				}, function (err) {
					library.schema.validate.called.should.be.true;

					restoreRewiredDeps();
					done();
				});
			});

			describe('when library.schema.validate fails', function () {

				it('should call series callback with error = "Invalid signatures body"', function (done) {

					var err = new Error('Transaction did not match schema');
					err.code = 'INVALID_FORMAT';
					library.schema.validate = sinon.stub().callsArgWith(2, err);

					__private.receiveSignatures({
						signatures: ['SIGNATURE123', 'SIGNATURE456']
					}, function (err) {
						library.schema.validate.called.should.be.true;
						err.should.equal('Invalid signatures body');
						done();
					});
				});
			});

			describe('when library.schema.validate succeeds', function () {

				describe('for every signature in signatures', function () {

					it('should call __private.receiveSignature with signature', function (done) {

						__private.receiveSignatures({
							signatures: ['SIGNATURE123', 'SIGNATURE456']
						}, function (err) {
							library.schema.validate.called.should.be.true;
							__private.receiveSignature.calledTwice.should.be.true;
							__private.receiveSignature.calledWith('SIGNATURE123').should.be.true;
							__private.receiveSignature.calledWith('SIGNATURE456').should.be.true;
							done();
						});
					});

					describe('when __private.receiveSignature fails', function () {

						it('should call library.logger.debug with err and signature', function (done) {
							var err = 'Error processing signature: Error message';
							__private.receiveSignature = sinon.stub().callsArgWith(1, err); // TODO: Also move to beforeEach
							library.logger.debug = sinon.spy();

							__private.receiveSignatures({
								signatures: ['SIGNATURE123', 'SIGNATURE456']
							}, function (err) {
								library.schema.validate.called.should.be.true;
								// If any of the __private.receiveSignature calls fail, the whole
								// receiveSignatures operation should fail immediately.
								__private.receiveSignature.calledOnce.should.be.true;
								library.logger.debug.calledWith(err, 'SIGNATURE123').should.be.true;
								done();
							});
						});

						it('should call callback with error', function (done) {
							var err = 'Error processing signature: Error message';
							__private.receiveSignature = sinon.stub().callsArgWith(1, err);
							library.logger.debug = sinon.spy();

							__private.receiveSignatures({
								signatures: ['SIGNATURE123', 'SIGNATURE456']
							}, function (err) {
								err.should.be.equal(err);
								done();
							});
						});
					});

					describe('when __private.receiveSignature succeeds', function () {

						it('should call callback with error null or undefined', function (done) {
							__private.receiveSignatures({
								signatures: ['SIGNATURE123', 'SIGNATURE456']
							}, function (err) {
								should.not.exist(err);
								done();
							});
						});
					});
				});
			});
		});

		describe('receiveSignature', function () {

			it('should call library.schema.validate');

			it('should call library.schema.validate with {signature: query}');

			it('should call library.schema.validate with schema.signature');

			describe('when library.schema.validate fails', function () {

				it('should call callback with error = "Invalid signature body"');
			});

			describe('when library.schema.validate succeeds', function () {

				it('should call modules.multisignatures.processSignature');

				it('should call modules.multisignatures.processSignature with query');

				describe('when modules.multisignatures.processSignature fails', function (){

					it('should call callback with error');
				});

				describe('when modules.multisignatures.processSignature succeeds', function (){

					it('should call callback with error = undefined');

					it('should call callback with result = undefined');
				});
			});
		});

		describe('receiveTransactions', function () {

			it('should call library.schema.validate');

			it('should call library.schema.validate with query');

			it('should call library.schema.validate with schema.transactions');

			describe('when library.schema.validate fails', function (){

				it('should call callback with error = "Invalid transactions body"');
			});

			describe('when library.schema.validate succeeds', function (){

				describe('for every transaction in transactions', function () {

					describe('when transaction is undefined', function () {

						it('should call callback with error = "Unable to process signature. Signature is undefined."');
					});

					describe('when transaction is defined', function () {

						it('should set transaction.bundle = true');

						it('should call __private.receiveTransaction');

						it('should call __private.receiveTransaction with transaction');

						it('should call __private.receiveTransaction with peer');

						it('should call __private.receiveTransaction with extraLogMessage');

						describe('when call __private.receiveTransaction fails', function () {

							it('should call library.logger.debug with error');

							it('should call library.logger.debug with transaction');

							it('should call callback with error');
						});

						describe('when call __private.receiveTransaction succeeds', function () {

							it('should call callback with error = undefined');

							it('should call callback with result = undefined');
						});
					});
				});
			});
		});

		describe('receiveTransaction', function () {

			it('should call library.logic.transaction.objectNormalize');

			it('should call library.logic.transaction.objectNormalize with transaction');

			describe('when library.logic.transaction.objectNormalize throws', function () {

				it('should call library.logger.debug');

				it('should call library.logger.debug with "Transaction normalization failed"');

				it('should call library.logger.debug with {id: id, err: e.toString(), module: "transport", tx: transaction}');

				it('should call __private.removePeer');

				it('should call __private.removePeer with {peer: peer, code: "ETRANSACTION"}');

				it('should call __private.removePeer with extraLogMessage');

				it('should call callback with error = "Invalid transaction body"');
			});

			it('should call library.balancesSequence.add');

			describe('when peer is undefined', function () {

				it('should call library.logger.debug with "Received transaction " + transaction.id + " from public client"');
			});

			describe('when peer is defined', function () {

				it('should call library.logger.debug with "Received transaction " + transaction.id + " from peer"');

				it('should call library.logic.peers.peersManager.getAddress');

				it('should call library.logic.peers.peersManager.getAddress with peer.nonce');
			});

			it('should call modules.transactions.processUnconfirmedTransaction');

			it('should call modules.transactions.processUnconfirmedTransaction with transaction');

			it('should call modules.transactions.processUnconfirmedTransaction with true');

			describe('when modules.transactions.processUnconfirmedTransaction fails', function () {

				it('should call library.logger.debug');

				it('should call library.logger.debug with "Transaction ${transaction.id}"');

				it('should call library.logger.debug with err.toString()');

				describe('and transaction is defined', function () {

					it('should call library.logger.debug');

					it('should call library.logger.debug with "Transaction"');

					it('should call library.logger.debug with transaction');
				});

				it('should call callback with err.toString()');
			});

			describe('when modules.transactions.processUnconfirmedTransaction succeeds', function () {

				it('should call callback with error = null');

				it('should call callback with result = transaction.id');
			});
		});
	});

	describe('Transport', function () {

		describe('headers', function () {

			describe('when headers is defined', function () {

				it('should set headers');
			});

			it('should return headers');
		});

		describe('poorConsensus', function () {

			describe('when consensus is undefined', function () {

				it('should set consensus = modules.peers.getConsensus()');
			});

			describe('when consensus is undefined', function () {

				it('should return false');
			});

			describe('when consensus is defined', function () {

				it('should return consensus < constants.minBroadhashConsensus');
			});
		});

		describe('getPeers', function () {

			it('should call __private.broadcaster.getPeers ');

			it('should call __private.broadcaster.getPeers  with params');

			it('should call __private.broadcaster.getPeers  with callback');
		});

		describe('onBind', function () {

			describe('modules', function () {

				it('should assign blocks');

				it('should assign dapps');

				it('should assign loader');

				it('should assign multisignatures');

				it('should assign peers');

				it('should assign system');

				it('should assign transaction');
			});

			it('should call System.getHeaders');

			it('should call __private.broadcaster.bind');

			it('should call __private.broadcaster.bind with scope.peers');

			it('should call __private.broadcaster.bind with scope.transport');

			it('should call __private.broadcaster.bind with scope.transactions');
		});

		describe('onSignature', function () {

			describe('when broadcast is defined', function () {

				it('should call __private.broadcaster.maxRelays');

				it('should call __private.broadcaster.maxRelays with signature');

				describe('when result of __private.broadcaster.maxRelays is false', function () {

					it('should call __private.broadcaster.enqueue');

					it('should call __private.broadcaster.enqueue with {}');

					it('should call __private.broadcaster.enqueue with {api: "postSignatures", data: {signature: signature}}');

					it('should call library.network.io.sockets.emit');

					it('should call library.network.io.sockets.emit with "signature/change"');

					it('should call library.network.io.sockets.emit with signature');
				});
			});
		});

		describe('onUnconfirmedTransaction', function () {

			describe('when broadcast is defined', function () {

				it('should call __private.broadcaster.maxRelays');

				it('should call __private.broadcaster.maxRelays with transaction');

				describe('when result of __private.broadcaster.maxRelays is false', function () {

					it('should call __private.broadcaster.enqueue');

					it('should call __private.broadcaster.enqueue with {}');

					it('should call __private.broadcaster.enqueue with {api: "postTransactions", data: {transaction: transaction}}');

					it('should call library.network.io.sockets.emit');

					it('should call library.network.io.sockets.emit with "transactions/change"');

					it('should call library.network.io.sockets.emit with transaction');
				});
			});
		});

		describe('onNewBlock', function () {

			describe('when broadcast is defined', function () {

				it('should call modules.system.update');

				describe('when modules.system.update succeeds', function () {

					it('should call __private.broadcaster.maxRelays');

					it('should call __private.broadcaster.maxRelays with blocks');

					describe('when __private.broadcaster.maxRelays with blocks = true', function () {

						it('should call library.logger.debug with "Broadcasting block aborted - max block relays exceeded"');
					});

					describe('when modules.loader.syncing = true', function () {

						it('should call library.logger.debug with "Broadcasting block aborted - blockchain synchronization in progress"');
					});

					it('should call modules.peers.list');

					it('should call modules.peers.list with {normalized: false}');

					describe('when peers = undefined', function () {

						it('should call library.logger.debug with "Broadcasting block aborted - active peer list empty"');
					});

					describe('when peers.length = 0', function () {

						it('should call library.logger.debug with "Broadcasting block aborted - active peer list empty"');
					});

					it('should call peers.filter');

					it('should call peers.filter with peer.state === Peer.STATE.CONNECTED');

					describe('for every filtered peer in peers', function () {

						it('should call peer.rpc.updateMyself');

						it('should call peer.rpc.updateMyself with library.logic.peers.me');

						describe('when peer.rpc.updateMyself fails', function () {

							it('should call __private.removePeer');

							it('should call __private.removePeer with {peer: peer, code: "ECOMMUNICATION"}');
						});

						describe('when peer.rpc.updateMyself succeeds', function () {

							it('should call library.logger.debug');

							it('should call __private.removePeer with "Peer notified correctly after update:" + peer.string');
						});
					});

					describe('when async.each succeeds', function () {

						it('should call __private.broadcaster.broadcast');

						it('should call __private.broadcaster.broadcast with {limit: constants.maxPeers, broadhash: modules.system.getBroadhash()}');

						it('should call __private.broadcaster.broadcast with {api: "postBlock", data: {block: block}, immediate: true}');
					});
				});
			});

			it('should call library.network.io.sockets.emit');

			it('should call library.network.io.sockets.emit with "blocks/change"');

			it('should call library.network.io.sockets.emit with block');
		});

		describe('shared', function () {

			describe('blocksCommon', function () {

				describe('when query is undefined', function () {

					it('should set query = {}');
				});

				it('should call library.schema.validate');

				it('should call library.schema.validate with query');

				it('should call library.schema.validate with schema.commonBlock');

				describe('when library.schema.validate fails', function () {

					it('should set err = err[0].message + ": " + err[0].path');

					it('should call library.logger.debug');

					it('should call library.logger.debug with "Common block request validation failed"');

					it('should call library.logger.debug with {err: err.toString(), req: query}');

					it('should call callback with error');
				});

				describe('when library.schema.validate succeeds', function () {

					describe('escapedIds', function () {

						it('should remove quotes from query.ids');

						it('should separate ids from query.ids by comma');

						it('should remove any non-numeric values from query.ids');
					});

					describe('when escapedIds.length = 0', function () {

						it('should call library.logger.debug');

						it('should call library.logger.debug with "Common block request validation failed"');

						it('should call library.logger.debug with {err: "ESCAPE", req: query.ids}');

						it('should call __private.removePeer');

						it('should call __private.removePeer with {peer: query.peer, code: "ECOMMON"}');

						it('should call callback with error = "Invalid block id sequence"');
					});

					it('should call library.db.query');

					it('should call library.db.query with sql.getCommonBlock');

					it('should call library.db.query with escapedIds');

					describe('when library.db.query fails', function () {

						it('should call library.logger.error with error stack');

						it('should call callback with error = "Failed to get common block"');
					});

					describe('when library.db.query succeeds', function () {

						it('should call callback with error = null');

						it('should call callback with result  = { success: true, common: rows[0] || null }');
					});
				});
			});

			describe('blocks', function () {

				describe('when query is undefined', function () {

					it('should set query = {}');
				});

				it('should call modules.blocks.utils.loadBlocksData');

				it('should call modules.blocks.utils.loadBlocksData with { limit: 34,lastId: query.lastBlockId }');

				describe('when modules.blocks.utils.loadBlocksData fails', function () {

					it('should call callback with error = null');

					it('should call callback with result = { blocks: [] }');
				});

				describe('when modules.blocks.utils.loadBlocksData fails', function () {

					it('should call callback with error = null');

					it('should call callback with result = { blocks: data }');
				});
			});

			describe('postBlock', function () {

				describe('when query is undefined', function () {

					it('should set query = {}');
				});

				describe('when it throws', function () {

					it('should call library.logger.debug');

					it('should call library.logger.debug with "Block normalization failed"');

					it('should call library.logger.debug with {err: e.toString(), module: "transport", block: query.block }');

					it('should call __private.removePeer');

					it('should call __private.removePeer with {peer: query.peer, code: "EBLOCK"}');

					it('should call callback with error = e.toString()');
				});

				describe('when it does not throw', function () {

					describe('when query.block is defined', function () {

						it('should call bson.deserialize');

						it('should call bson.deserialize with Buffer.from(query.block)');

						describe('block', function () {

							it('should call modules.blocks.verify.addBlockProperties');

							it('should call modules.blocks.verify.addBlockProperties with query.block');
						});
					});

					it('should call library.logic.block.objectNormalize');
				});

				it('should call library.bus.message');

				it('should call library.bus.message with "receiveBlock"');

				it('should call library.bus.message with block');

				it('should call callback with error = null');

				it('should call callback with result = {success: true, blockId: block.id}');
			});

			describe('list', function () {

				describe('when req is undefined', function () {

					it('should set req = {}');
				});

				describe('peersFinder', function () {

					describe('when req.query is undefined', function () {

						it('should set peerFinder = modules.peers.list');
					});

					describe('when req.query is defined', function () {

						it('should set peerFinder = modules.peers.shared.getPeers');
					});
				});

				it('should call peersFinder');

				it('should call peersFinder with Object.assign({}, {limit: constants.maxPeers}, req.query)');

				describe('when peersFinder fails', function () {

					it('should set peers to []');
				});

				it('should return callback with error = null');

				it('should return callback with result = {success: !err, peers: peers}');
			});

			describe('height', function () {

				it('should call callback with error = null');

				it('should call callback with result = {success: true, height: modules.system.getHeight()}');
			});

			describe('status', function () {

				it('should call callback with error = null');

				it('should call callback with result = {success: true, height: modules.system.getHeight(), broadhash: modules.system.getBroadhash(), nonce: modules.system.getNonce()}');
			});

			describe('postSignatures', function () {

				describe('when query.signatures is defined', function () {

					it('should call __private.receiveSignatures');

					it('should call __private.receiveSignatures with query');

					describe('when __private.receiveSignatures fails', function () {

						it('should call callback with error = null');

						it('should call callback with result = {success: false, message: err}');
					});

					describe('when __private.receiveSignatures succeeds', function () {

						it('should call callback with error = null');

						it('should call callback with result = {success: true}');
					});
				});

				describe('when query.signatures is undefined', function () {

					it('should call __private.receiveSignature');

					it('should call __private.receiveSignature with query.signature');

					describe('when __private.receiveSignature fails', function () {

						it('should call callback with error = null');

						it('should call callback with result = {success: false, message: err}');
					});

					describe('when __private.receiveSignature succeeds', function () {

						it('should call callback with error = null');

						it('should call callback with result = {success: true}');
					});
				});
			});

			describe('getSignatures', function () {

				it('should call modules.transactions.getMultisignatureTransactionList');

				it('should call modules.transactions.getMultisignatureTransactionList with true');

				it('should call modules.transactions.getMultisignatureTransactionList with constants.maxSharedTxs');

				describe('for every transaction', function () {

					describe('when trs.signatures are defined', function () {

						describe('and trs.signatures.length is defined', function () {

							describe('signature', function () {

								it('should assign transaction: trs.id');

								it('should assign signatures: trs.signatures');
							});
						});
					});
				});

				it('should call callback with error = null');

				it('should call callback with result = {success: true, signatures: signatures}');
			});

			describe('getTransactions', function () {

				it('should call modules.transactions.getMergedTransactionList');

				it('should call modules.transactions.getMergedTransactionList with true');

				it('should call modules.transactions.getMergedTransactionList with constants.maxSharedTxs');

				it('should call callback with error = null');

				it('should call callback with result = {success: true, transactions: transactions}');
			});

			describe('postTransactions', function () {

				describe('when query.transactions is defined', function () {

					it('should call __private.receiveTransactions');

					it('should call __private.receiveTransactions with query');

					it('should call __private.receiveTransactions with query.peer');

					it('should call __private.receiveTransactions with query.extraLogMessage');

					describe('when __private.receiveTransactions fails', function () {

						it('should call callback with error = null');

						it('should call callback with result = {success: false, message: err}');
					});

					describe('when __private.receiveTransactions succeeds', function () {

						it('should call callback with error = null');

						it('should call callback with result = {success: true}');
					});
				});

				describe('when query.transactions is undefined', function () {

					it('should call __private.receiveTransaction');

					it('should call __private.receiveTransaction with query.transaction');

					it('should call __private.receiveTransaction with query.peer');

					it('should call __private.receiveTransaction with query.extraLogMessage');

					describe('when __private.receiveTransaction fails', function () {

						it('should call callback with error = null');

						it('should call callback with result = {success: false,  message: err}');
					});

					describe('when __private.receiveTransaction succeeds', function () {

						it('should call callback with error = null');

						it('should call callback with result = {success: true, transactionId: id}');
					});
				});
			});
		});
	});

	describe('__private.checkInternalAccess', function () {

		it('should call library.schema.validate');

		it('should call library.schema.validate with query');

		it('should call library.schema.validate with schema.internalAccess');

		describe('when library.schema.validate fails', function () {

			it('should call callback with error = err[0].message');
		});

		describe('when library.schema.validate succeeds', function () {

			describe('when query.authKey != wsRPC.getServerAuthKey()', function () {

				it('should call callback with error = "Unable to access internal function - Incorrect authKey"');
			});

			it(('should call callback with error = null'));

			it(('should call callback with result = undefined'));
		});
	});

	describe('Transport.prototype.internal', function () {

		describe('updatePeer', function () {

			it('should call __private.checkInternalAccess');

			it('should call __private.checkInternalAccess with query');

			describe('when __private.checkInternalAccess fails', function () {

				it('should call callback wit error = err');
			});

			describe('when __private.checkInternalAccess succeeds', function () {

				describe('updateResult', function () {

					describe('when query.updateType = 0 (insert)', function () {

						it('should call modules.peers.update');

						it('should call modules.peers.update with query.peer');
					});

					describe('when query.updateType = 1 (remove)', function () {

						it('should call modules.peers.remove');

						it('should call modules.peers.remove with query.peer');
					});
				});

				describe('when updateResult = false', function () {

					it('should call callback with error = new PeerUpdateError(updateResult, failureCodes.errorMessages[updateResult])');
				});

				describe('when updateResult = true', function () {

					it('should call callback with error = null');
				});
			});
		});
	});
});
