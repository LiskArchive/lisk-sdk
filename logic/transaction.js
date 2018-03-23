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

const crypto = require('crypto');
const extend = require('extend');
const ByteBuffer = require('bytebuffer');
const _ = require('lodash');
const bignum = require('../helpers/bignum.js');
const { TOTAL_AMOUNT } = require('../helpers/constants.js');
const exceptions = require('../helpers/exceptions.js');
const slots = require('../helpers/slots.js');

const __private = {};

/**
 * Main transaction logic.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires bytebuffer
 * @requires crypto
 * @requires extend
 * @requires lodash
 * @requires helpers/bignum
 * @requires helpers/constants
 * @requires helpers/exceptions
 * @requires helpers/slots
 * @param {Database} db
 * @param {Object} ed
 * @param {ZSchema} schema
 * @param {Object} genesisblock
 * @param {Account} account
 * @param {Object} logger
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error, this
 * @todo Add description for the params
 */
class Transaction {
	constructor(db, ed, schema, genesisblock, account, logger, cb) {
		/**
		 * @typedef {Object} privateTypes
		 * - 0: Transfer
		 * - 1: Signature
		 * - 2: Delegate
		 * - 3: Vote
		 * - 4: Multisignature
		 * - 5: DApp
		 * - 6: InTransfer
		 * - 7: OutTransfer
		 */
		__private.types = {};

		this.scope = {
			db,
			ed,
			schema,
			genesisblock,
			account,
			logger,
		};

		if (cb) {
			return setImmediate(cb, null, this);
		}
	}

	/**
	 * Creates a signature.
	 *
	 * @param {Object} keypair - Constains privateKey and publicKey
	 * @param {transaction} transaction
	 * @returns {signature}
	 * @todo Add description for the params
	 */
	sign(keypair, transaction) {
		const hash = this.getHash(transaction);
		return this.scope.ed.sign(hash, keypair.privateKey).toString('hex');
	}

	/**
	 * Creates a signature based on multiple signatures
	 *
	 * @param {Object} keypair - Constains privateKey and publicKey
	 * @param {transaction} transaction
	 * @returns {signature}
	 * @todo Add description for the params
	 */
	multisign(keypair, transaction) {
		const bytes = this.getBytes(transaction, true, true);
		const hash = crypto
			.createHash('sha256')
			.update(bytes)
			.digest();

		return this.scope.ed.sign(hash, keypair.privateKey).toString('hex');
	}

	/**
	 * Calculates transaction id based on transaction
	 *
	 * @param {transaction} transaction
	 * @returns {string} Transaction id
	 * @todo Add description for the params
	 */
	getId(transaction) {
		const hash = this.getHash(transaction);
		const temp = Buffer.alloc(8);
		for (let i = 0; i < 8; i++) {
			temp[i] = hash[7 - i];
		}

		const id = bignum.fromBuffer(temp).toString();
		return id;
	}

	/**
	 * Creates hash based on transaction bytes.
	 *
	 * @param {transaction} transaction
	 * @returns {hash} SHA256 hash
	 * @todo Add description for the params
	 */
	getHash(transaction) {
		return crypto
			.createHash('sha256')
			.update(this.getBytes(transaction))
			.digest();
	}

	/**
	 * Calls `getBytes` based on transaction type (see privateTypes)
	 * @see {@link privateTypes}
	 *
	 * @param {transaction} transaction
	 * @param {boolean} skipSignature
	 * @param {boolean} skipSecondSignature
	 * @throws {Error}
	 * @returns {!Array} Contents as an ArrayBuffer
	 * @todo Add description for the params
	 */
	getBytes(transaction, skipSignature, skipSecondSignature) {
		if (!__private.types[transaction.type]) {
			throw `Unknown transaction type ${transaction.type}`;
		}

		let byteBuffer;

		try {
			const assetBytes = __private.types[transaction.type].getBytes.call(
				this,
				transaction,
				skipSignature,
				skipSecondSignature
			);
			const assetSize = assetBytes ? assetBytes.length : 0;

			byteBuffer = new ByteBuffer(
				1 + 4 + 32 + 32 + 8 + 8 + 64 + 64 + assetSize,
				true
			);
			byteBuffer.writeByte(transaction.type);
			byteBuffer.writeInt(transaction.timestamp);

			const senderPublicKeyBuffer = Buffer.from(
				transaction.senderPublicKey,
				'hex'
			);
			for (let i = 0; i < senderPublicKeyBuffer.length; i++) {
				byteBuffer.writeByte(senderPublicKeyBuffer[i]);
			}

			if (transaction.requesterPublicKey) {
				const requesterPublicKey = Buffer.from(
					transaction.requesterPublicKey,
					'hex'
				);
				for (let i = 0; i < requesterPublicKey.length; i++) {
					byteBuffer.writeByte(requesterPublicKey[i]);
				}
			}

			if (transaction.recipientId) {
				let recipient = transaction.recipientId.slice(0, -1);
				recipient = new bignum(recipient).toBuffer({ size: 8 });

				for (let i = 0; i < 8; i++) {
					byteBuffer.writeByte(recipient[i] || 0);
				}
			} else {
				for (let i = 0; i < 8; i++) {
					byteBuffer.writeByte(0);
				}
			}

			byteBuffer.writeLong(transaction.amount);

			if (assetSize > 0) {
				for (let i = 0; i < assetSize; i++) {
					byteBuffer.writeByte(assetBytes[i]);
				}
			}

			if (!skipSignature && transaction.signature) {
				const signatureBuffer = Buffer.from(transaction.signature, 'hex');
				for (let i = 0; i < signatureBuffer.length; i++) {
					byteBuffer.writeByte(signatureBuffer[i]);
				}
			}

			if (!skipSecondSignature && transaction.signSignature) {
				const signSignatureBuffer = Buffer.from(
					transaction.signSignature,
					'hex'
				);
				for (let i = 0; i < signSignatureBuffer.length; i++) {
					byteBuffer.writeByte(signSignatureBuffer[i]);
				}
			}

			byteBuffer.flip();
		} catch (e) {
			throw e;
		}

		return byteBuffer.toBuffer();
	}

	/**
	 * Calls `ready` based on transaction type (see privateTypes).
	 *
	 * @see {@link privateTypes}
	 * @param {transaction} transaction
	 * @param {account} sender
	 * @returns {function|boolean} Calls `ready()` on sub class | false
	 * @todo Add description for the params
	 */
	ready(transaction, sender) {
		if (!__private.types[transaction.type]) {
			throw `Unknown transaction type ${transaction.type}`;
		}

		if (!sender) {
			return false;
		}

		return __private.types[transaction.type].ready.call(
			this,
			transaction,
			sender
		);
	}

	/**
	 * Counts transactions from `trs` table by id.
	 *
	 * @param {transaction} transaction
	 * @param {function} cb
	 * @returns {SetImmediate} error, row.count
	 * @todo Add description for the params
	 */
	countById(transaction, cb) {
		this.scope.db.transactions
			.countById(transaction.id)
			.then(count => setImmediate(cb, null, count))
			.catch(err => {
				this.scope.logger.error(err.stack);
				return setImmediate(cb, 'Transaction#countById error');
			});
	}

	/**
	 * Description of the function.
	 *
	 * @param {transaction} transaction
	 * @param {function} cb
	 * @returns {SetImmediate} error
	 * @todo Add description for the params
	 */
	checkConfirmed(transaction, cb) {
		this.countById(transaction, (err, count) => {
			if (err) {
				return setImmediate(cb, err);
			} else if (count > 0) {
				return setImmediate(
					cb,
					`Transaction is already confirmed: ${transaction.id}`
				);
			}
			return setImmediate(cb);
		});
	}

	/**
	 * Checks if balance is less than amount for sender.
	 *
	 * @param {number} amount
	 * @param {number} balance
	 * @param {transaction} transaction
	 * @param {account} sender
	 * @returns {Object} With exceeded boolean and error: address, balance
	 * @todo Add description for the params
	 */
	checkBalance(amount, balance, transaction, sender) {
		const exceededBalance = new bignum(sender[balance].toString()).lessThan(
			amount
		);
		const exceeded =
			transaction.blockId !== this.scope.genesisblock.block.id &&
			exceededBalance;

		return {
			exceeded,
			error: exceeded
				? [
						'Account does not have enough LSK:',
						sender.address,
						'balance:',
						new bignum(sender[balance].toString() || '0').div(Math.pow(10, 8)),
					].join(' ')
				: null,
		};
	}

	/**
	 * Validates parameters.
	 * Calls `process` based on transaction type (see privateTypes).
	 *
	 * @see {@link privateTypes}
	 * @param {transaction} transaction
	 * @param {account} sender
	 * @param {account} requester
	 * @param {function} cb
	 * @returns {SetImmediate} error, transaction
	 * @todo Add description for the params
	 */
	process(transaction, sender, requester, cb, tx) {
		if (typeof requester === 'function') {
			cb = requester;
		}

		// Check transaction type
		if (!__private.types[transaction.type]) {
			return setImmediate(cb, `Unknown transaction type ${transaction.type}`);
		}

		// Check sender
		if (!sender) {
			return setImmediate(cb, 'Missing sender');
		}

		// Get transaction id
		let txId;

		try {
			txId = this.getId(transaction);
		} catch (e) {
			this.scope.logger.error(e.stack);
			return setImmediate(cb, 'Failed to get transaction id');
		}

		// Check transaction id
		if (transaction.id && transaction.id !== txId) {
			return setImmediate(cb, 'Invalid transaction id');
		}
		transaction.id = txId;

		// Equalize sender address
		transaction.senderId = sender.address;

		// Call process on transaction type
		__private.types[transaction.type].process.call(
			this,
			transaction,
			sender,
			(err, transaction) => {
				if (err) {
					return setImmediate(cb, err);
				}
				return setImmediate(cb, null, transaction);
			},
			tx
		);
	}

	/**
	 * Validates parameters.
	 * Calls `process` based on transaction type (see privateTypes).
	 *
	 * @see {@link privateTypes}
	 * @param {transaction} transaction
	 * @param {account} sender
	 * @param {account} requester
	 * @param {function} cb
	 * @returns {SetImmediate} error, transaction
	 * @todo Add description for the params
	 */
	verify(transaction, sender, requester, cb, tx) {
		let valid = false;
		let err = null;

		if (typeof requester === 'function') {
			cb = requester;
		}

		// Check sender
		if (!sender) {
			return setImmediate(cb, 'Missing sender');
		}

		// Check transaction type
		if (!__private.types[transaction.type]) {
			return setImmediate(cb, `Unknown transaction type ${transaction.type}`);
		}

		// Check for missing sender second signature
		if (
			!transaction.requesterPublicKey &&
			sender.secondSignature &&
			!transaction.signSignature &&
			transaction.blockId !== this.scope.genesisblock.block.id
		) {
			return setImmediate(cb, 'Missing sender second signature');
		}

		// If second signature provided, check if sender has one enabled
		if (
			!transaction.requesterPublicKey &&
			!sender.secondSignature &&
			(transaction.signSignature && transaction.signSignature.length > 0)
		) {
			return setImmediate(cb, 'Sender does not have a second signature');
		}

		// Check for missing requester second signature
		if (
			transaction.requesterPublicKey &&
			requester.secondSignature &&
			!transaction.signSignature
		) {
			return setImmediate(cb, 'Missing requester second signature');
		}

		// If second signature provided, check if requester has one enabled
		if (
			transaction.requesterPublicKey &&
			!requester.secondSignature &&
			(transaction.signSignature && transaction.signSignature.length > 0)
		) {
			return setImmediate(cb, 'Requester does not have a second signature');
		}

		// Check sender public key
		if (sender.publicKey && sender.publicKey !== transaction.senderPublicKey) {
			err = [
				'Invalid sender public key:',
				transaction.senderPublicKey,
				'expected:',
				sender.publicKey,
			].join(' ');

			if (exceptions.senderPublicKey.indexOf(transaction.id) > -1) {
				this.scope.logger.error(err);
				this.scope.logger.debug(JSON.stringify(transaction));
			} else {
				return setImmediate(cb, err);
			}
		}

		// Check sender is not genesis account unless block id equals genesis
		if (
			[
				exceptions.genesisPublicKey.mainnet,
				exceptions.genesisPublicKey.testnet,
			].indexOf(sender.publicKey) !== -1 &&
			transaction.blockId !== this.scope.genesisblock.block.id
		) {
			return setImmediate(
				cb,
				'Invalid sender. Can not send from genesis account'
			);
		}

		// Check sender address
		if (
			String(transaction.senderId).toUpperCase() !==
			String(sender.address).toUpperCase()
		) {
			return setImmediate(cb, 'Invalid sender address');
		}

		// Determine multisignatures from sender or transaction asset
		const multisignatures = sender.multisignatures || [];
		if (multisignatures.length === 0) {
			if (
				transaction.asset &&
				transaction.asset.multisignature &&
				transaction.asset.multisignature.keysgroup
			) {
				for (
					let i = 0;
					i < transaction.asset.multisignature.keysgroup.length;
					i++
				) {
					const key = transaction.asset.multisignature.keysgroup[i];

					if (!key || typeof key !== 'string') {
						return setImmediate(cb, 'Invalid member in keysgroup');
					}

					multisignatures.push(key.slice(1));
				}
			}
		}

		// Check requester public key
		if (transaction.requesterPublicKey) {
			multisignatures.push(transaction.senderPublicKey);

			if (
				!Array.isArray(sender.multisignatures) ||
				sender.multisignatures.indexOf(transaction.requesterPublicKey) < 0
			) {
				return setImmediate(
					cb,
					'Account does not belong to multisignature group'
				);
			}
		}

		// Verify signature
		try {
			valid = false;
			valid = this.verifySignature(
				transaction,
				transaction.requesterPublicKey || transaction.senderPublicKey,
				transaction.signature
			);
		} catch (e) {
			this.scope.logger.error(e.stack);
			return setImmediate(cb, e.toString());
		}

		if (!valid) {
			err = 'Failed to verify signature';

			if (exceptions.signatures.indexOf(transaction.id) > -1) {
				this.scope.logger.error(err);
				this.scope.logger.debug(JSON.stringify(transaction));
				valid = true;
				err = null;
			} else {
				return setImmediate(cb, err);
			}
		}

		// Verify second signature
		if (requester.secondSignature || sender.secondSignature) {
			try {
				valid = false;
				valid = this.verifySecondSignature(
					transaction,
					requester.secondPublicKey || sender.secondPublicKey,
					transaction.signSignature
				);
			} catch (e) {
				return setImmediate(cb, e.toString());
			}

			if (!valid) {
				return setImmediate(cb, 'Failed to verify second signature');
			}
		}

		// Check that signatures are unique
		if (transaction.signatures && transaction.signatures.length) {
			const signatures = transaction.signatures.reduce((p, c) => {
				if (p.indexOf(c) < 0) {
					p.push(c);
				}
				return p;
			}, []);

			if (signatures.length !== transaction.signatures.length) {
				return setImmediate(
					cb,
					'Encountered duplicate signature in transaction'
				);
			}
		}

		// Verify multisignatures
		if (transaction.signatures) {
			for (let d = 0; d < transaction.signatures.length; d++) {
				valid = false;

				for (let s = 0; s < multisignatures.length; s++) {
					if (
						transaction.requesterPublicKey &&
						multisignatures[s] === transaction.requesterPublicKey
					) {
						continue; // eslint-disable-line no-continue
					}

					if (
						this.verifySignature(
							transaction,
							multisignatures[s],
							transaction.signatures[d]
						)
					) {
						valid = true;
					}
				}

				if (!valid) {
					return setImmediate(cb, 'Failed to verify multisignature');
				}
			}
		}

		// Calculate fee
		const fee =
			__private.types[transaction.type].calculateFee.call(
				this,
				transaction,
				sender
			) || false;
		if (!fee || transaction.fee !== fee) {
			return setImmediate(cb, 'Invalid transaction fee');
		}

		// Check amount
		if (
			transaction.amount < 0 ||
			transaction.amount > TOTAL_AMOUNT ||
			String(transaction.amount).indexOf('.') >= 0 ||
			transaction.amount.toString().indexOf('e') >= 0
		) {
			return setImmediate(cb, 'Invalid transaction amount');
		}

		// Check confirmed sender balance
		const amount = new bignum(transaction.amount.toString()).plus(
			transaction.fee.toString()
		);
		const senderBalance = this.checkBalance(
			amount,
			'balance',
			transaction,
			sender
		);

		if (senderBalance.exceeded) {
			return setImmediate(cb, senderBalance.error);
		}

		// Check timestamp
		if (slots.getSlotNumber(transaction.timestamp) > slots.getSlotNumber()) {
			return setImmediate(
				cb,
				'Invalid transaction timestamp. Timestamp is in the future'
			);
		}

		// Call verify on transaction type
		__private.types[transaction.type].verify.call(
			this,
			transaction,
			sender,
			err => {
				if (err) {
					return setImmediate(cb, err);
				}
				// Check for already confirmed transaction
				return this.checkConfirmed(transaction, cb);
			},
			tx
		);
	}

	/**
	 * Verifies signature for valid transaction type.
	 *
	 * @param {transaction} transaction
	 * @param {publicKey} publicKey
	 * @param {signature} signature
	 * @throws {Error}
	 * @returns {boolean}
	 * @todo Add description for the params
	 */
	verifySignature(transaction, publicKey, signature) {
		if (!__private.types[transaction.type]) {
			throw `Unknown transaction type ${transaction.type}`;
		}

		if (!signature) {
			return false;
		}

		try {
			const bytes = this.getBytes(transaction, true, true);
			return this.verifyBytes(bytes, publicKey, signature);
		} catch (e) {
			throw e;
		}
	}

	/**
	 * Verifies second signature for valid transaction type.
	 *
	 * @param {transaction} transaction
	 * @param {publicKey} publicKey
	 * @param {signature} signature
	 * @throws {Error}
	 * @returns {boolean}
	 * @todo Add description for the params
	 */
	verifySecondSignature(transaction, publicKey, signature) {
		if (!__private.types[transaction.type]) {
			throw `Unknown transaction type ${transaction.type}`;
		}

		if (!signature) {
			return false;
		}

		try {
			const bytes = this.getBytes(transaction, false, true);
			return this.verifyBytes(bytes, publicKey, signature);
		} catch (e) {
			throw e;
		}
	}

	/**
	 * Verifies hash, publicKey and signature.
	 *
	 * @param {Array} bytes
	 * @param {publicKey} publicKey
	 * @param {signature} signature
	 * @throws {Error}
	 * @returns {boolean} true - If verified hash, signature and publicKey
	 * @todo Add description for the params
	 */
	verifyBytes(bytes, publicKey, signature) {
		try {
			const data2 = Buffer.alloc(bytes.length);

			for (let i = 0; i < data2.length; i++) {
				data2[i] = bytes[i];
			}

			const hash = crypto
				.createHash('sha256')
				.update(data2)
				.digest();
			const signatureBuffer = Buffer.from(signature, 'hex');
			const publicKeyBuffer = Buffer.from(publicKey, 'hex');

			return this.scope.ed.verify(
				hash,
				signatureBuffer || ' ',
				publicKeyBuffer || ' '
			);
		} catch (e) {
			throw e;
		}
	}

	/**
	 * Merges account into sender address, Calls `apply` based on transaction type (privateTypes).
	 *
	 * @see {@link privateTypes}
	 * @param {transaction} transaction
	 * @param {block} block
	 * @param {account} sender
	 * @param {function} cb - Callback function
	 * @returns {SetImmediate} error
	 * @todo Add description for the params
	 */
	apply(transaction, block, sender, cb, tx) {
		if (!this.ready(transaction, sender)) {
			return setImmediate(cb, 'Transaction is not ready');
		}

		// Check confirmed sender balance
		let amount = new bignum(transaction.amount.toString()).plus(
			transaction.fee.toString()
		);
		const senderBalance = this.checkBalance(
			amount,
			'balance',
			transaction,
			sender
		);

		if (senderBalance.exceeded) {
			return setImmediate(cb, senderBalance.error);
		}

		amount = amount.toNumber();

		this.scope.logger.trace('Logic/Transaction->apply', {
			sender: sender.address,
			balance: -amount,
			blockId: block.id,
			round: slots.calcRound(block.height),
		});

		this.scope.account.merge(
			sender.address,
			{
				balance: -amount,
				blockId: block.id,
				round: slots.calcRound(block.height),
			},
			(err, sender) => {
				if (err) {
					return setImmediate(cb, err);
				}
				/**
				 * Calls apply for Transfer, Signature, Delegate, Vote, Multisignature,
				 * DApp, InTransfer or OutTransfer.
				 */
				__private.types[transaction.type].apply.call(
					this,
					transaction,
					block,
					sender,
					err => {
						if (err) {
							this.scope.account.merge(
								sender.address,
								{
									balance: amount,
									blockId: block.id,
									round: slots.calcRound(block.height),
								},
								err => setImmediate(cb, err),
								tx
							);
						} else {
							return setImmediate(cb);
						}
					},
					tx
				);
			},
			tx
		);
	}

	/**
	 * Merges account into sender address, Calls `undo` based on transaction type (privateTypes).
	 *
	 * @see {@link privateTypes}
	 * @param {transaction} transaction
	 * @param {block} block
	 * @param {account} sender
	 * @param {function} cb - Callback function
	 * @returns {SetImmediate} error
	 * @todo Add description for the params
	 */
	undo(transaction, block, sender, cb) {
		let amount = new bignum(transaction.amount.toString());
		amount = amount.plus(transaction.fee.toString()).toNumber();

		this.scope.logger.trace('Logic/Transaction->undo', {
			sender: sender.address,
			balance: amount,
			blockId: block.id,
			round: slots.calcRound(block.height),
		});

		this.scope.account.merge(
			sender.address,
			{
				balance: amount,
				blockId: block.id,
				round: slots.calcRound(block.height),
			},
			(err, sender) => {
				if (err) {
					return setImmediate(cb, err);
				}

				__private.types[transaction.type].undo.call(
					this,
					transaction,
					block,
					sender,
					err => {
						if (err) {
							this.scope.account.merge(
								sender.address,
								{
									balance: -amount,
									blockId: block.id,
									round: slots.calcRound(block.height),
								},
								err => setImmediate(cb, err)
							);
						} else {
							return setImmediate(cb);
						}
					}
				);
			}
		);
	}

	/**
	 * Checks unconfirmed sender balance. Merges account into sender address with
	 * unconfirmed balance negative amount. Calls `applyUnconfirmed` based on
	 * transaction type (privateTypes). If error merge account with amount.
	 *
	 * @see {@link privateTypes}
	 * @param {transaction} transaction
	 * @param {account} sender
	 * @param {account} requester
	 * @param {function} cb - Callback function
	 * @returns {SetImmediate} error
	 * @todo Add description for the params
	 */
	applyUnconfirmed(transaction, sender, requester, cb, tx) {
		if (typeof requester === 'function') {
			if (cb) {
				tx = cb;
			}

			cb = requester;
		}

		// Check unconfirmed sender balance
		let amount = new bignum(transaction.amount.toString()).plus(
			transaction.fee.toString()
		);
		const senderBalance = this.checkBalance(
			amount,
			'u_balance',
			transaction,
			sender
		);

		if (senderBalance.exceeded) {
			return setImmediate(cb, senderBalance.error);
		}

		amount = amount.toNumber();

		this.scope.account.merge(
			sender.address,
			{ u_balance: -amount },
			(err, sender) => {
				if (err) {
					return setImmediate(cb, err);
				}

				__private.types[transaction.type].applyUnconfirmed.call(
					this,
					transaction,
					sender,
					err => {
						if (err) {
							this.scope.account.merge(
								sender.address,
								{ u_balance: amount },
								err2 => setImmediate(cb, err2 || err),
								tx
							);
						} else {
							return setImmediate(cb);
						}
					},
					tx
				);
			},
			tx
		);
	}

	/**
	 * Merges account into sender address with unconfirmed balance transaction amount.
	 * Calls `undoUnconfirmed` based on transaction type (privateTypes). If error merge
	 * account with megative amount.
	 *
	 * @see {@link privateTypes}
	 * @param {transaction} transaction
	 * @param {account} sender
	 * @param {function} cb - Callback function
	 * @returns {SetImmediate} error
	 * @todo Add description for the params
	 */
	undoUnconfirmed(transaction, sender, cb, tx) {
		let amount = new bignum(transaction.amount.toString());
		amount = amount.plus(transaction.fee.toString()).toNumber();

		this.scope.account.merge(
			sender.address,
			{ u_balance: amount },
			(err, sender) => {
				if (err) {
					return setImmediate(cb, err);
				}

				__private.types[transaction.type].undoUnconfirmed.call(
					this,
					transaction,
					sender,
					err => {
						if (err) {
							this.scope.account.merge(
								sender.address,
								{ u_balance: -amount },
								err2 => setImmediate(cb, err2 || err),
								tx
							);
						} else {
							return setImmediate(cb);
						}
					},
					tx
				);
			},
			tx
		);
	}

	/**
	 * Calls `afterSave` based on transaction type (privateTypes).
	 *
	 * @see {@link privateTypes}
	 * @param {transaction} transaction
	 * @param {function} cb
	 * @returns {SetImmediate} error
	 * @todo Add description for the params
	 */
	afterSave(transaction, cb) {
		const transactionType = __private.types[transaction.type];

		if (!transactionType) {
			return setImmediate(cb, `Unknown transaction type ${transaction.type}`);
		} else if (typeof transactionType.afterSave === 'function') {
			return transactionType.afterSave.call(this, transaction, cb);
		}
		return setImmediate(cb);
	}

	/**
	 * Calls `objectNormalize` based on transaction type (privateTypes).
	 *
	 * @see {@link privateTypes}
	 * @param {transaction} transaction
	 * @throws {string}
	 * @returns {error|transaction}
	 * @todo Add description for the params
	 */
	objectNormalize(transaction) {
		if (_.isEmpty(transaction)) {
			throw 'Empty trs passed';
		}
		if (!__private.types[transaction.type]) {
			throw `Unknown transaction type ${transaction.type}`;
		}

		for (const i of Object.keys(transaction)) {
			if (
				transaction[i] === null ||
				typeof transaction[i] === 'undefined' ||
				(_.isString(transaction[i]) && _.isEmpty(transaction[i]))
			) {
				delete transaction[i];
			}
		}

		if (transaction.amount) {
			transaction.amount = parseInt(transaction.amount);
		}

		if (transaction.fee) {
			transaction.fee = parseInt(transaction.fee);
		}

		const report = this.scope.schema.validate(
			transaction,
			Transaction.prototype.schema
		);

		if (!report) {
			throw `Failed to validate transaction schema: ${this.scope.schema
				.getLastErrors()
				.map(err => err.message)
				.join(', ')}`;
		}

		try {
			transaction = __private.types[transaction.type].objectNormalize.call(
				this,
				transaction
			);
		} catch (e) {
			throw e;
		}

		return transaction;
	}

	/**
	 * Calls `dbRead` based on transaction type (privateTypes) to add tr asset.
	 *
	 * @see {@link privateTypes}
	 * @param {Object} raw
	 * @throws {string} If unknown transaction type
	 * @returns {null|transaction}
	 * @todo Add description for the params
	 */
	dbRead(raw) {
		if (!raw.t_id) {
			return null;
		}

		const transaction = {
			id: raw.t_id,
			height: raw.b_height,
			blockId: raw.b_id || raw.t_blockId,
			type: parseInt(raw.t_type),
			timestamp: parseInt(raw.t_timestamp),
			senderPublicKey: raw.t_senderPublicKey,
			requesterPublicKey: raw.t_requesterPublicKey,
			senderId: raw.t_senderId,
			recipientId: raw.t_recipientId,
			recipientPublicKey: raw.m_recipientPublicKey || null,
			amount: parseInt(raw.t_amount),
			fee: parseInt(raw.t_fee),
			signature: raw.t_signature,
			signSignature: raw.t_signSignature,
			signatures: raw.t_signatures ? raw.t_signatures.split(',') : [],
			confirmations: parseInt(raw.confirmations),
			asset: {},
		};

		if (!__private.types[transaction.type]) {
			throw `Unknown transaction type ${transaction.type}`;
		}

		const asset = __private.types[transaction.type].dbRead.call(this, raw);

		if (asset) {
			transaction.asset = extend(transaction.asset, asset);
		}

		return transaction;
	}
}

// TODO: The below functions should be converted into static functions,
// however, this will lead to incompatibility with modules and tests implementation.
/**
 * Sets private type based on type id after instance object validation.
 *
 * @param {number} typeId
 * @param {Object} instance
 * @throws {string} If invalid instance interface
 * @returns {Object}
 * @todo Add description for the params
 */
Transaction.prototype.attachAssetType = function(typeId, instance) {
	if (
		instance &&
		typeof instance.getBytes === 'function' &&
		typeof instance.calculateFee === 'function' &&
		typeof instance.verify === 'function' &&
		typeof instance.objectNormalize === 'function' &&
		typeof instance.dbRead === 'function' &&
		typeof instance.apply === 'function' &&
		typeof instance.undo === 'function' &&
		typeof instance.applyUnconfirmed === 'function' &&
		typeof instance.undoUnconfirmed === 'function' &&
		typeof instance.ready === 'function' &&
		typeof instance.process === 'function'
	) {
		__private.types[typeId] = instance;
		return instance;
	}
	throw 'Invalid instance interface';
};

/**
 * @typedef {Object} transaction
 * @property {string} id
 * @property {number} height
 * @property {string} blockId
 * @property {number} type
 * @property {number} timestamp
 * @property {publicKey} senderPublicKey
 * @property {publicKey} requesterPublicKey
 * @property {string} senderId
 * @property {string} recipientId
 * @property {number} amount
 * @property {number} fee
 * @property {string} signature
 * @property {string} signSignature
 * @property {Object} asset
 * @property {multisignature} [asset.multisignature]
 * @property {signature} [asset.signature]
 * @property {dapp} [asset.dapp]
 * @property {Object} [asset.outTransfer] - Contains dappId and transactionId
 * @property {Object} [asset.inTransfer] - Contains dappId
 * @property {votes} [asset.votes] - Contains multiple votes to a transactionId
 *
 */
Transaction.prototype.schema = {
	id: 'Transaction',
	type: 'object',
	properties: {
		id: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20,
		},
		height: {
			type: 'integer',
		},
		blockId: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20,
		},
		type: {
			type: 'integer',
		},
		timestamp: {
			type: 'integer',
		},
		senderPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		requesterPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		senderId: {
			type: 'string',
			format: 'address',
			minLength: 1,
			maxLength: 22,
		},
		recipientId: {
			type: 'string',
			format: 'address',
			minLength: 1,
			maxLength: 22,
		},
		amount: {
			type: 'integer',
			minimum: 0,
			maximum: TOTAL_AMOUNT,
		},
		fee: {
			type: 'integer',
			minimum: 0,
			maximum: TOTAL_AMOUNT,
		},
		signature: {
			type: 'string',
			format: 'signature',
		},
		signSignature: {
			type: 'string',
			format: 'signature',
		},
		asset: {
			type: 'object',
		},
	},
	required: ['type', 'timestamp', 'senderPublicKey', 'signature'],
};

module.exports = Transaction;
