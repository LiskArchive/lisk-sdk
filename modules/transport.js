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

var Broadcaster = require('../logic/broadcaster.js');
var bson = require('../helpers/bson.js');
var constants = require('../helpers/constants.js');
var failureCodes = require('../api/ws/rpc/failure_codes');
var PeerUpdateError = require('../api/ws/rpc/failure_codes').PeerUpdateError;
var Rules = require('../api/ws/workers/rules');
var wsRPC = require('../api/ws/rpc/ws_rpc').wsRPC;

// Private fields
var modules;
var definitions;
var library;
var self;
var __private = {};

__private.loaded = false;
__private.messages = {};

/**
 * Initializes library with scope content and generates a Broadcaster instance.
 * @memberof module:transport
 * @class
 * @classdesc Main Transport methods.
 * @param {function} cb - Callback function.
 * @param {scope} scope - App instance.
 * @return {setImmediateCallback} Callback function with `self` as data.
 */
// Constructor
function Transport(cb, scope) {
	library = {
		logger: scope.logger,
		db: scope.db,
		bus: scope.bus,
		schema: scope.schema,
		network: scope.network,
		balancesSequence: scope.balancesSequence,
		logic: {
			block: scope.logic.block,
			transaction: scope.logic.transaction,
			peers: scope.logic.peers,
		},
		config: {
			peers: {
				options: {
					timeout: scope.config.peers.options.timeout,
				},
			},
			forging: {
				force: scope.config.forging.force,
			},
		},
	};
	self = this;

	__private.broadcaster = new Broadcaster(
		scope.config.broadcasts,
		scope.config.forging.force,
		scope.logic.peers,
		scope.logic.transaction,
		scope.logger
	);

	setImmediate(cb, null, self);
}

/**
 * Removes a peer based on ip and port.
 * @private
 * @implements {modules.peers.remove}
 * @param {Object} options - Contains code and peer
 * @param {string} extraMessage
 */
__private.removePeer = function(options, extraMessage) {
	if (!options.peer) {
		library.logger.debug('Cannot remove empty peer');
		return false;
	}

	library.logger.debug(
		[
			options.code,
			'Removing peer',
			`${options.peer.ip}:${options.peer.wsPort}`,
			extraMessage,
		].join(' ')
	);
	return modules.peers.remove(options.peer);
};

/**
 * Validates signatures body and for each signature calls receiveSignature.
 * @private
 * @implements {library.schema.validate}
 * @implements {__private.receiveSignature}
 * @param {Object} query
 * @param {function} cb
 * @return {setImmediateCallback} cb, err
 */
__private.receiveSignatures = function(query, cb) {
	var signatures;

	async.series(
		{
			validateSchema: function(seriesCb) {
				library.schema.validate(query, definitions.WSSignaturesList, err => {
					if (err) {
						return setImmediate(seriesCb, 'Invalid signatures body');
					} else {
						return setImmediate(seriesCb);
					}
				});
			},
			receiveSignatures: function(seriesCb) {
				signatures = query.signatures;

				async.eachSeries(
					signatures,
					(signature, eachSeriesCb) => {
						__private.receiveSignature(signature, err => {
							if (err) {
								library.logger.debug(err, signature);
							}

							return setImmediate(eachSeriesCb, err);
						});
					},
					seriesCb
				);
			},
		},
		err => setImmediate(cb, err)
	);
};

/**
 * Validates signature with schema and calls processSignature.
 * @private
 * @implements {library.schema.validate}
 * @implements {modules.multisignatures.processSignature}
 * @param {Object} query
 * @param {string} query.signature
 * @param {Object} query.transaction
 * @return {setImmediateCallback} cb | error messages
 */
__private.receiveSignature = function(query, cb) {
	library.schema.validate(query, definitions.Signature, err => {
		if (err) {
			return setImmediate(cb, `Invalid signature body ${err[0].message}`);
		}

		modules.multisignatures.processSignature(query, err => {
			if (err) {
				return setImmediate(cb, `Error processing signature: ${err}`);
			} else {
				return setImmediate(cb);
			}
		});
	});
};

/**
 * Validates transactions with schema and calls receiveTransaction for each
 * transaction.
 * @private
 * @implements {library.schema.validate}
 * @implements {__private.receiveTransaction}
 * @param {Object} query - Contains transactions
 * @param {peer} peer
 * @param {string} extraLogMessage
 * @param {function} cb
 * @return {setImmediateCallback} cb, err
 */
__private.receiveTransactions = function(query, peer, extraLogMessage, cb) {
	var transactions;

	transactions = query.transactions;

	async.eachSeries(
		transactions,
		(transaction, eachSeriesCb) => {
			if (!transaction) {
				return setImmediate(
					eachSeriesCb,
					'Unable to process transaction. Transaction is undefined.'
				);
			}
			transaction.bundled = true;

			__private.receiveTransaction(transaction, peer, extraLogMessage, err => {
				if (err) {
					library.logger.debug(err, transaction);
				}
				return setImmediate(eachSeriesCb, err);
			});
		},
		cb
	);
};

/**
 * Normalizes transaction and remove peer if it fails.
 * Calls balancesSequence.add to receive transaction and
 * processUnconfirmedTransaction to confirm it.
 * @private
 * @implements {library.logic.transaction.objectNormalize}
 * @implements {__private.removePeer}
 * @implements {library.balancesSequence.add}
 * @implements {modules.transactions.processUnconfirmedTransaction}
 * @param {transaction} transaction
 * @param {peer} peer
 * @param {string} extraLogMessage
 * @param {function} cb
 * @return {setImmediateCallback} cb, error message
 */
__private.receiveTransaction = function(
	transaction,
	peer,
	extraLogMessage,
	cb
) {
	var id = transaction ? transaction.id : 'null';

	try {
		transaction = library.logic.transaction.objectNormalize(transaction);
	} catch (e) {
		library.logger.debug('Transaction normalization failed', {
			id: id,
			err: e.toString(),
			module: 'transport',
			transaction: transaction,
		});

		__private.removePeer({ peer: peer, code: 'ETRANSACTION' }, extraLogMessage);

		return setImmediate(cb, `Invalid transaction body - ${e.toString()}`);
	}

	library.balancesSequence.add(cb => {
		if (!peer) {
			library.logger.debug(
				`Received transaction ${transaction.id} from public client`
			);
		} else {
			library.logger.debug(
				`Received transaction ${
					transaction.id
				} from peer ${library.logic.peers.peersManager.getAddress(peer.nonce)}`
			);
		}
		modules.transactions.processUnconfirmedTransaction(
			transaction,
			true,
			err => {
				if (err) {
					library.logger.debug(['Transaction', id].join(' '), err.toString());
					if (transaction) {
						library.logger.debug('Transaction', transaction);
					}

					return setImmediate(cb, err.toString());
				} else {
					return setImmediate(cb, null, transaction.id);
				}
			}
		);
	}, cb);
};

// Public methods

/**
 * Returns true if broadcaster consensus is less than minBroadhashConsensus.
 * Returns false if library.config.forging.force is true.
 * @return {boolean}
 */
Transport.prototype.poorConsensus = function() {
	if (library.config.forging.force) {
		return false;
	}
	return modules.peers.calculateConsensus() < constants.minBroadhashConsensus;
};

/**
 * Calls getPeers method from Broadcaster class.
 * @implements {Broadcaster.getPeers}
 * @param {Object} params
 * @param {function} cb
 * @return {Broadcaster.getPeers} calls getPeers
 */
Transport.prototype.getPeers = function(params, cb) {
	return __private.broadcaster.getPeers(params, cb);
};

// Events
/**
 * Bounds scope to private broadcaster amd initialize headers.
 * @implements {broadcaster.bind}
 * @param {modules} scope - Loaded modules.
 */
Transport.prototype.onBind = function(scope) {
	modules = {
		blocks: scope.blocks,
		dapps: scope.dapps,
		loader: scope.loader,
		multisignatures: scope.multisignatures,
		peers: scope.peers,
		system: scope.system,
		transactions: scope.transactions,
	};

	definitions = scope.swagger.definitions;

	__private.broadcaster.bind(scope.peers, scope.transport, scope.transactions);
};

/**
 * Sets private variable loaded to true
 */
Transport.prototype.onBlockchainReady = function() {
	__private.loaded = true;
};

/**
 * Calls enqueue signatures and emits a 'signature/change' socket message.
 * @implements {Broadcaster.maxRelays}
 * @implements {Broadcaster.enqueue}
 * @implements {library.network.io.sockets.emit}
 * @param {signature} signature
 * @param {Object} broadcast
 * @emits signature/change
 */
Transport.prototype.onSignature = function(signature, broadcast) {
	if (broadcast && !__private.broadcaster.maxRelays(signature)) {
		__private.broadcaster.enqueue(
			{},
			{ api: 'postSignatures', data: { signature: signature } }
		);
		library.network.io.sockets.emit('signature/change', signature);
	}
};

/**
 * Calls enqueue transactions and emits a 'transactions/change' socket message.
 * @implements {Broadcaster.maxRelays}
 * @implements {Broadcaster.enqueue}
 * @implements {library.network.io.sockets.emit}
 * @param {transaction} transaction
 * @param {Object} broadcast
 * @emits transactions/change
 */
Transport.prototype.onUnconfirmedTransaction = function(
	transaction,
	broadcast
) {
	if (broadcast && !__private.broadcaster.maxRelays(transaction)) {
		__private.broadcaster.enqueue(
			{},
			{ api: 'postTransactions', data: { transaction: transaction } }
		);
		library.network.io.sockets.emit('transactions/change', transaction);
	}
};

/**
 * Calls broadcast blocks and emits a 'blocks/change' socket message.
 * @implements {modules.system.getBroadhash}
 * @implements {Broadcaster.maxRelays}
 * @implements {Broadcaster.broadcast}
 * @implements {library.network.io.sockets.emit}
 * @param {block} block
 * @param {Object} broadcast
 * @emits blocks/change
 */
Transport.prototype.onBroadcastBlock = function(block, broadcast) {
	if (broadcast) {
		modules.system.update(() => {
			if (__private.broadcaster.maxRelays(block)) {
				return library.logger.debug(
					'Broadcasting block aborted - max block relays exceeded'
				);
			} else if (modules.loader.syncing()) {
				return library.logger.debug(
					'Broadcasting block aborted - blockchain synchronization in progress'
				);
			}
			modules.peers.list({ normalized: false }, (err, peers) => {
				if (!peers || peers.length === 0) {
					return library.logger.debug(
						'Broadcasting block aborted - active peer list empty'
					);
				}
				async.each(
					peers,
					(peer, cb) => {
						peer.rpc.updateMyself(library.logic.peers.me(), err => {
							if (err) {
								library.logger.debug('Failed to notify peer about self', err);
								__private.removePeer({ peer: peer, code: 'ECOMMUNICATION' });
							} else {
								library.logger.debug(
									'Successfully notified peer about self',
									peer.string
								);
							}
							return cb();
						});
					},
					() => {
						__private.broadcaster.broadcast(
							{
								limit: constants.maxPeers,
								broadhash: modules.system.getBroadhash(),
							},
							{ api: 'postBlock', data: { block: block }, immediate: true }
						);
					}
				);
			});
		});
		library.network.io.sockets.emit('blocks/change', block);
	}
};

/**
 * Sets loaded to false.
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
Transport.prototype.cleanup = function(cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

/**
 * Returns true if modules are loaded and private variable loaded is true.
 * @return {boolean}
 */
Transport.prototype.isLoaded = function() {
	return modules && __private.loaded;
};

// Internal API
/**
 * @todo implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
Transport.prototype.shared = {
	blocksCommon: function(query, cb) {
		query = query || {};
		return library.schema.validate(
			query,
			definitions.WSBlocksCommonRequest,
			err => {
				if (err) {
					err = `${err[0].message}: ${err[0].path}`;
					library.logger.debug('Common block request validation failed', {
						err: err.toString(),
						req: query,
					});
					return setImmediate(cb, err);
				}

				var escapedIds = query.ids
					// Remove quotes
					.replace(/['"]+/g, '')
					// Separate by comma into an array
					.split(',')
					// Reject any non-numeric values
					.filter(id => /^[0-9]+$/.test(id));

				if (!escapedIds.length) {
					library.logger.debug('Common block request validation failed', {
						err: 'ESCAPE',
						req: query.ids,
					});

					__private.removePeer({ peer: query.peer, code: 'ECOMMON' });

					return setImmediate(cb, 'Invalid block id sequence');
				}

				library.db.blocks
					.getBlocksForTransport(escapedIds)
					.then(rows =>
						setImmediate(cb, null, { success: true, common: rows[0] || null })
					)
					.catch(err => {
						library.logger.error(err.stack);
						return setImmediate(cb, 'Failed to get common block');
					});
			}
		);
	},

	blocks: function(query, cb) {
		// Get 34 blocks with all data (joins) from provided block id
		// According to maxium payload of 58150 bytes per block with every transaction being a vote
		// Discounting maxium compression setting used in middleware
		// Maximum transport payload = 2000000 bytes
		query = query || {};
		modules.blocks.utils.loadBlocksData(
			{
				limit: 34, // 1977100 bytes
				lastId: query.lastBlockId,
			},
			(err, data) => {
				if (err) {
					return setImmediate(cb, null, { blocks: [] });
				}

				return setImmediate(cb, null, { blocks: data });
			}
		);
	},

	postBlock: function(query, cb) {
		query = query || {};
		var block;
		try {
			if (query.block) {
				query.block = bson.deserialize(Buffer.from(query.block));
				block = modules.blocks.verify.addBlockProperties(query.block);
			}
			block = library.logic.block.objectNormalize(block);
		} catch (e) {
			library.logger.debug('Block normalization failed', {
				err: e.toString(),
				module: 'transport',
				block: query.block,
			});

			__private.removePeer({ peer: query.peer, code: 'EBLOCK' });

			return setImmediate(cb, e.toString());
		}

		library.bus.message('receiveBlock', block);

		return setImmediate(cb, null, { success: true, blockId: block.id });
	},

	list: function(req, cb) {
		req = req || {};
		var peersFinder = !req.query
			? modules.peers.list
			: modules.peers.shared.getPeers;
		peersFinder(
			Object.assign({}, { limit: constants.maxPeers }, req.query),
			(err, peers) => {
				peers = !err ? peers : [];
				return setImmediate(cb, null, { success: !err, peers: peers });
			}
		);
	},

	height: function(req, cb) {
		return setImmediate(cb, null, {
			success: true,
			height: modules.system.getHeight(),
		});
	},

	status: function(req, cb) {
		var headers = modules.system.headers();
		return setImmediate(cb, null, {
			success: true,
			height: headers.height,
			broadhash: headers.broadhash,
			nonce: headers.nonce,
			httpPort: headers.httpPort,
			version: headers.version,
			os: headers.os,
		});
	},

	postSignatures: function(query, cb) {
		if (query.signatures) {
			__private.receiveSignatures(query, err => {
				if (err) {
					return setImmediate(cb, null, { success: false, message: err });
				} else {
					return setImmediate(cb, null, { success: true });
				}
			});
		} else {
			__private.receiveSignature(query.signature, err => {
				if (err) {
					return setImmediate(cb, null, { success: false, message: err });
				} else {
					return setImmediate(cb, null, { success: true });
				}
			});
		}
	},

	getSignatures: function(req, cb) {
		var transactions = modules.transactions.getMultisignatureTransactionList(
			true,
			constants.maxSharedTxs
		);
		var signatures = [];

		async.eachSeries(
			transactions,
			(transaction, __cb) => {
				if (transaction.signatures && transaction.signatures.length) {
					signatures.push({
						transaction: transaction.id,
						signatures: transaction.signatures,
					});
				}
				return setImmediate(__cb);
			},
			() => setImmediate(cb, null, { success: true, signatures: signatures })
		);
	},

	getTransactions: function(query, cb) {
		var transactions = modules.transactions.getMergedTransactionList(
			true,
			constants.maxSharedTxs
		);
		return setImmediate(cb, null, {
			success: true,
			transactions: transactions,
		});
	},

	postTransactions: function(query, cb) {
		library.schema.validate(query, definitions.WSTransactionsRequest, err => {
			if (err) {
				return setImmediate(cb, null, { success: false, message: err });
			}

			if (query.transactions.length == 1) {
				__private.receiveTransaction(
					query.transactions[0],
					query.peer,
					query.extraLogMessage,
					(err, id) => {
						if (err) {
							return setImmediate(cb, null, { success: false, message: err });
						} else {
							return setImmediate(cb, null, {
								success: true,
								transactionId: id,
							});
						}
					}
				);
			} else {
				__private.receiveTransactions(
					query,
					query.peer,
					query.extraLogMessage,
					err => {
						if (err) {
							return setImmediate(cb, null, { success: false, message: err });
						}
						return setImmediate(cb, null, { success: true });
					}
				);
			}
		});
	},
};

/**
 * Validation of all internal requests
 * @param {Object} query
 * @param {string} query.authKey - key shared between master and slave processes. Not shared with the rest of network.
 * @param {Object} query.peer - peer to update
 * @param {number} query.updateType - 0 (insert) or 1 (remove)
 * @param {function} cb
 */
__private.checkInternalAccess = function(query, cb) {
	library.schema.validate(query, definitions.WSAccessObject, err => {
		if (err) {
			return setImmediate(cb, err[0].message);
		}
		if (query.authKey !== wsRPC.getServerAuthKey()) {
			return setImmediate(
				cb,
				'Unable to access internal function - Incorrect authKey'
			);
		}
		return setImmediate(cb, null);
	});
};

Transport.prototype.internal = {
	/**
	 * Inserts or updates a peer on peers list
	 * @param {Object} query
	 * @param {Object} query.peer
	 * @param {string} query.authKey - signed peer data with in hex format
	 * @param {number} query.updateType - 0 (insert) or 1 (remove)
	 * @param {function} cb
	 */
	updatePeer: function(query, cb) {
		__private.checkInternalAccess(query, err => {
			if (err) {
				return setImmediate(cb, err);
			}
			var updates = {};
			updates[Rules.UPDATES.INSERT] = modules.peers.update;
			updates[Rules.UPDATES.REMOVE] = modules.peers.remove;
			var updateResult = updates[query.updateType](query.peer);
			return setImmediate(
				cb,
				updateResult === true
					? null
					: new PeerUpdateError(
							updateResult,
							failureCodes.errorMessages[updateResult]
						)
			);
		});
	},
};

// Export
module.exports = Transport;
