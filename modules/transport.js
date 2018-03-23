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
 * Main transport methods. Initializes library with scope content and generates a Broadcaster instance.
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires async
 * @requires api/ws/rpc/failure_codes
 * @requires api/ws/rpc/failure_codes
 * @requires api/ws/workers/rules
 * @requires api/ws/rpc/ws_rpc
 * @requires helpers/constants
 * @requires logic/broadcaster
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 * @returns {setImmediateCallback} cb, null, self
 */
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
			broadcasts: {
				active: scope.config.broadcasts.active,
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
 *
 * @private
 * @param {Object} options - Contains code and peer's nonce
 * @param {number} options.code
 * @param {string} options.nonce
 * @param {string} extraMessage - Extra message
 * @todo Add description for the params
 * @todo Add @returns tag
 */
__private.removePeer = function(options, extraMessage) {
	if (!options.nonce) {
		library.logger.debug('Cannot remove peer without nonce');
		return false;
	}
	const peer = library.logic.peers.peersManager.getByNonce(options.nonce);
	if (!peer) {
		library.logger.debug('Cannot match a peer to provided nonce');
		return false;
	}
	library.logger.debug(
		[
			options.code,
			'Removing peer',
			`${peer.ip}:${peer.wsPort}`,
			extraMessage,
		].join(' ')
	);
	return modules.peers.remove(peer);
};

/**
 * Validates signatures body and for each signature calls receiveSignature.
 *
 * @private
 * @implements {__private.receiveSignature}
 * @param {Array} signatures - Array of signatures
 */
__private.receiveSignatures = function(signatures = []) {
	signatures.forEach(signature => {
		__private.receiveSignature(signature, err => {
			if (err) {
				library.logger.debug(err, signature);
			}
		});
	});
};

/**
 * Validates signature with schema and calls processSignature.
 *
 * @private
 * @param {Object} query
 * @param {string} query.signature
 * @param {Object} query.transaction
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 */
__private.receiveSignature = function(query, cb) {
	library.schema.validate(query, definitions.Signature, err => {
		if (err) {
			return setImmediate(cb, `Invalid signature body ${err[0].message}`);
		}

		modules.multisignatures.processSignature(query, err => {
			if (err) {
				return setImmediate(cb, `Error processing signature: ${err}`);
			}
			return setImmediate(cb);
		});
	});
};

/**
 * Validates transactions with schema and calls receiveTransaction for each transaction.
 *
 * @private
 * @implements {library.schema.validate}
 * @implements {__private.receiveTransaction}
 * @param {Array} transactions - Array of transactions
 * @param {string} nonce - Peer's nonce
 * @param {string} extraLogMessage - Extra log message
 */
__private.receiveTransactions = function(
	transactions = [],
	nonce,
	extraLogMessage
) {
	transactions.forEach(transaction => {
		if (transaction) {
			transaction.bundled = true;
		}
		__private.receiveTransaction(transaction, nonce, extraLogMessage, err => {
			if (err) {
				library.logger.debug(err, transaction);
			}
		});
	});
};

/**
 * Normalizes transaction and remove peer if it fails.
 * Calls balancesSequence.add to receive transaction and
 * processUnconfirmedTransaction to confirm it.
 *
 * @private
 * @param {transaction} transaction
 * @param {string} nonce
 * @param {string} extraLogMessage - Extra log message
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 */
__private.receiveTransaction = function(
	transaction,
	nonce,
	extraLogMessage,
	cb
) {
	var id = transaction ? transaction.id : 'null';

	try {
		// This sanitizes the transaction object and then validates it.
		// Throws an error if validation fails.
		transaction = library.logic.transaction.objectNormalize(transaction);
	} catch (e) {
		library.logger.debug('Transaction normalization failed', {
			id,
			err: e.toString(),
			module: 'transport',
			transaction,
		});

		__private.removePeer({ nonce, code: 'ETRANSACTION' }, extraLogMessage);

		return setImmediate(cb, `Invalid transaction body - ${e.toString()}`);
	}

	library.balancesSequence.add(balancesSequenceCb => {
		if (!nonce) {
			library.logger.debug(
				`Received transaction ${transaction.id} from public client`
			);
		} else {
			library.logger.debug(
				`Received transaction ${
					transaction.id
				} from peer ${library.logic.peers.peersManager.getAddress(nonce)}`
			);
		}
		modules.transactions.processUnconfirmedTransaction(
			transaction,
			true,
			processUnconfirmErr => {
				if (processUnconfirmErr) {
					library.logger.debug(
						['Transaction', id].join(' '),
						processUnconfirmErr.toString()
					);
					if (transaction) {
						library.logger.debug('Transaction', transaction);
					}

					return setImmediate(
						balancesSequenceCb,
						processUnconfirmErr.toString()
					);
				}
				return setImmediate(balancesSequenceCb, null, transaction.id);
			}
		);
	}, cb);
};

// Public methods

/**
 * Returns true if broadcaster consensus is less than minBroadhashConsensus.
 * Returns false if library.config.forging.force is true.
 *
 * @returns {boolean}
 * @todo Add description for the return value
 */
Transport.prototype.poorConsensus = function() {
	if (library.config.forging.force) {
		return false;
	}
	return modules.peers.calculateConsensus() < constants.minBroadhashConsensus;
};

/**
 * Calls getPeers method from Broadcaster class.
 *
 * @param {Object} params
 * @param {function} cb - Callback function
 * @returns {Broadcaster.getPeers} Calls getPeers
 * @todo Add description for the params
 */
Transport.prototype.getPeers = function(params, cb) {
	return __private.broadcaster.getPeers(params, cb);
};

// Events
/**
 * Bounds scope to private broadcaster amd initialize headers.
 *
 * @param {modules} scope - Loaded modules
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
 * Sets private variable loaded to true.
 */
Transport.prototype.onBlockchainReady = function() {
	__private.loaded = true;
};

/**
 * Calls enqueue signatures and emits a 'signature/change' socket message.
 *
 * @param {signature} signature
 * @param {Object} broadcast
 * @emits signature/change
 * @todo Add description for the params
 */
Transport.prototype.onSignature = function(signature, broadcast) {
	if (broadcast && !__private.broadcaster.maxRelays(signature)) {
		__private.broadcaster.enqueue(
			{},
			{ api: 'postSignatures', data: { signatures: [signature] } }
		);
		library.network.io.sockets.emit('signature/change', signature);
	}
};

/**
 * Calls enqueue transactions and emits a 'transactions/change' socket message.
 *
 * @param {transaction} transaction
 * @param {Object} broadcast
 * @emits transactions/change
 * @todo Add description for the params
 */
Transport.prototype.onUnconfirmedTransaction = function(
	transaction,
	broadcast
) {
	if (broadcast && !__private.broadcaster.maxRelays(transaction)) {
		__private.broadcaster.enqueue(
			{},
			{ api: 'postTransactions', data: { transactions: [transaction] } }
		);
		library.network.io.sockets.emit('transactions/change', transaction);
	}
};

/**
 * Calls broadcast blocks and emits a 'blocks/change' socket message.
 *
 * @param {block} block
 * @param {Object} broadcast
 * @emits blocks/change
 * @todo Add description for the params
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
							{ api: 'postBlock', data: { block }, immediate: true }
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
 *
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb
 * @todo Add description for the params
 */
Transport.prototype.cleanup = function(cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

/**
 * Returns true if modules are loaded and private variable loaded is true.
 *
 * @returns {boolean}
 * @todo Add description for the return value
 */
Transport.prototype.isLoaded = function() {
	return modules && __private.loaded;
};

// Internal API
/**
 * @property {function} blocksCommon
 * @property {function} blocks
 * @property {function} postBlock
 * @property {function} list
 * @property {function} height
 * @property {function} status
 * @property {function} postSignatures
 * @property {function} getSignatures
 * @property {function} getTransactions
 * @property {function} postTransactions
 * @todo Add description for the functions
 * @todo Implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
Transport.prototype.shared = {
	/**
	 * Description of blocksCommon.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	blocksCommon(query, cb) {
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

	/**
	 * Description of blocks.
	 *
	 * @todo Add @param tags
	 * @todo Add description of the function
	 */
	blocks(query, cb) {
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

	/**
	 * Description of postBlock.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	postBlock(query) {
		if (!library.config.broadcasts.active) {
			return library.logger.debug(
				'Receiving blocks disabled by user through config.json'
			);
		}
		query = query || {};
		library.schema.validate(query, definitions.WSBlocksBroadcast, err => {
			if (err) {
				return library.logger.debug(
					'Received post block broadcast request in unexpected format',
					{
						err,
						module: 'transport',
						query,
					}
				);
			}
			let block;
			try {
				block = modules.blocks.verify.addBlockProperties(query.block);
				block = library.logic.block.objectNormalize(block);
			} catch (e) {
				library.logger.debug('Block normalization failed', {
					err: e.toString(),
					module: 'transport',
					block: query.block,
				});

				__private.removePeer({ nonce: query.nonce, code: 'EBLOCK' });
			}
			library.bus.message('receiveBlock', block);
		});
	},

	/**
	 * Description of list.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	list(req, cb) {
		req = req || {};
		var peersFinder = !req.query
			? modules.peers.list
			: modules.peers.shared.getPeers;
		peersFinder(
			Object.assign({}, { limit: constants.maxPeers }, req.query),
			(err, peers) => {
				peers = !err ? peers : [];
				return setImmediate(cb, null, { success: !err, peers });
			}
		);
	},

	/**
	 * Description of height.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	height(req, cb) {
		return setImmediate(cb, null, {
			success: true,
			height: modules.system.getHeight(),
		});
	},

	/**
	 * Description of status.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	status(req, cb) {
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

	/**
	 * Description of postSignature.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	postSignature(query, cb) {
		__private.receiveSignature(query.signature, err => {
			if (err) {
				return setImmediate(cb, null, { success: false, message: err });
			}
			return setImmediate(cb, null, { success: true });
		});
	},

	/**
	 * Description of postSignatures.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	postSignatures(query) {
		if (!library.config.broadcasts.active) {
			return library.logger.debug(
				'Receiving signatures disabled by user through config.json'
			);
		}
		library.schema.validate(query, definitions.WSSignaturesList, err => {
			if (err) {
				return library.logger.debug('Invalid signatures body', err);
			}
			__private.receiveSignatures(query.signatures);
		});
	},

	/**
	 * Description of getSignatures.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	getSignatures(req, cb) {
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
			() => setImmediate(cb, null, { success: true, signatures })
		);
	},

	/**
	 * Description of getTransactions.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	getTransactions(query, cb) {
		var transactions = modules.transactions.getMergedTransactionList(
			true,
			constants.maxSharedTxs
		);
		return setImmediate(cb, null, {
			success: true,
			transactions,
		});
	},

	/**
	 * Description of postTransaction.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	postTransaction(query, cb) {
		__private.receiveTransaction(
			query.transaction,
			query.nonce,
			query.extraLogMessage,
			(err, id) => {
				if (err) {
					return setImmediate(cb, null, { success: false, message: err });
				}
				return setImmediate(cb, null, {
					success: true,
					transactionId: id,
				});
			}
		);
	},

	/**
	 * Description of postTransactions.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	postTransactions(query) {
		if (!library.config.broadcasts.active) {
			return library.logger.debug(
				'Receiving transactions disabled by user through config.json'
			);
		}
		library.schema.validate(query, definitions.WSTransactionsRequest, err => {
			if (err) {
				return library.logger.debug('Invalid transactions body', err);
			}
			__private.receiveTransactions(
				query.transactions,
				query.nonce,
				query.extraLogMessage
			);
		});
	},
};

/**
 * Validation of all internal requests.
 *
 * @param {Object} query
 * @param {string} query.authKey - Key shared between master and slave processes. Not shared with the rest of network
 * @param {Object} query.peer - Peer to update
 * @param {number} query.updateType - 0 (insert) or 1 (remove)
 * @param {function} cb
 * @todo Add description for the params
 * @todo Add @returns tag
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
	 * Inserts or updates a peer on peers list.
	 *
	 * @param {Object} query
	 * @param {Object} query.peer
	 * @param {string} query.authKey - Signed peer data with in hex format
	 * @param {number} query.updateType - 0 (insert) or 1 (remove)
	 * @param {function} cb
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	updatePeer(query, cb) {
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
