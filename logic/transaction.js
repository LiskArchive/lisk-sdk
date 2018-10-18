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
const Bignum = require('../helpers/bignum.js');
const slots = require('../helpers/slots.js');

const exceptions = global.exceptions;
const POSTGRESQL_BIGINT_MAX_VALUE = '9223372036854775807';
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
 * @requires helpers/slots
 * @param {Database} db
 * @param {Object} ed
 * @param {ZSchema} schema
 * @param {Object} genesisBlock
 * @param {Account} account
 * @param {Object} logger
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error, this
 * @todo Add description for the params
 */
class Transaction {
	constructor(db, ed, schema, genesisBlock, account, logger, cb) {
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
			genesisBlock,
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

		const id = Bignum.fromBuffer(temp).toString();
		return id;
	}

	/**
	 * Creates hash based on transaction bytes.
	 *
	 * @param {transaction} transaction
	 * @returns {Buffer} SHA256 hash
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
	/* eslint-disable class-methods-use-this */
	getBytes(transaction, skipSignature, skipSecondSignature) {
		if (!__private.types[transaction.type]) {
			throw `Unknown transaction type ${transaction.type}`;
		}

		let byteBuffer;

		try {
			const assetBytes = __private.types[transaction.type].getBytes(
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

			const senderPublicKeyBuffer = this.scope.ed.hexToBuffer(
				transaction.senderPublicKey
			);
			for (let i = 0; i < senderPublicKeyBuffer.length; i++) {
				byteBuffer.writeByte(senderPublicKeyBuffer[i]);
			}

			if (transaction.requesterPublicKey) {
				const requesterPublicKey = this.scope.ed.hexToBuffer(
					transaction.requesterPublicKey
				);
				for (let i = 0; i < requesterPublicKey.length; i++) {
					byteBuffer.writeByte(requesterPublicKey[i]);
				}
			}

			if (transaction.recipientId) {
				let recipient = transaction.recipientId.slice(0, -1);
				recipient = new Bignum(recipient).toBuffer({ size: 8 });

				for (let i = 0; i < 8; i++) {
					byteBuffer.writeByte(recipient[i] || 0);
				}
			} else {
				for (let i = 0; i < 8; i++) {
					byteBuffer.writeByte(0);
				}
			}

			byteBuffer.writeLong(transaction.amount.toString());

			if (assetSize > 0) {
				for (let i = 0; i < assetSize; i++) {
					byteBuffer.writeByte(assetBytes[i]);
				}
			}

			if (!skipSignature && transaction.signature) {
				const signatureBuffer = this.scope.ed.hexToBuffer(
					transaction.signature
				);
				for (let i = 0; i < signatureBuffer.length; i++) {
					byteBuffer.writeByte(signatureBuffer[i]);
				}
			}

			if (!skipSecondSignature && transaction.signSignature) {
				const signSignatureBuffer = this.scope.ed.hexToBuffer(
					transaction.signSignature
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
	/* eslint-disable class-methods-use-this */
	ready(transaction, sender) {
		if (!__private.types[transaction.type]) {
			throw `Unknown transaction type ${transaction.type}`;
		}

		if (!sender) {
			return false;
		}

		return __private.types[transaction.type].ready(transaction, sender);
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
	 * Returns true if a transaction was confirmed.
	 *
	 * @param {transaction} transaction
	 * @param {function} cb
	 * @returns {SetImmediate} error, isConfirmed
	 * @todo Add description for the params
	 */
	checkConfirmed(transaction, cb) {
		if (!transaction || !transaction.id) {
			return setImmediate(cb, 'Invalid transaction id', false);
		}
		this.countById(transaction, (err, count) => {
			if (err) {
				return setImmediate(cb, err, false);
			} else if (count > 0) {
				return setImmediate(cb, null, true);
			}
			return setImmediate(cb, null, false);
		});
	}

	/**
	 * Checks if balance is less than amount for sender.
	 *
	 * @param {BigNumber} amount
	 * @param {string} field
	 * @param {transaction} transaction
	 * @param {account} sender
	 * @returns {Object} With exceeded boolean and error: address, balance
	 * @todo Add description for the params
	 */
	checkBalance(amount, field, transaction, sender) {
		const exceededBalance = new Bignum(sender[field]).isLessThan(amount);
		const exceeded =
			transaction.blockId !== this.scope.genesisBlock.block.id &&
			exceededBalance;

		return {
			exceeded,
			error: exceeded
				? [
						'Account does not have enough LSK:',
						sender.address,
						'balance:',
						new Bignum(sender[field].toString() || '0').div(Math.pow(10, 8)),
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
		__private.types[transaction.type].process(
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
	 * @param  {boolean} checkExists - Check if transaction already exists in database
	 * @param {function} cb
	 * @returns {SetImmediate} error, transaction
	 * @todo Add description for the params
	 */
	verify(transaction, sender, requester, checkExists, cb, tx) {
		let valid = false;
		let err = null;
		const INT_32_MIN = -2147483648;
		const INT_32_MAX = 2147483647;

		if (requester === null || requester === undefined) {
			requester = {};
		}

		// Check sender
		if (!sender) {
			return setImmediate(cb, 'Missing sender');
		}

		// Check transaction type
		if (!__private.types[transaction.type]) {
			return setImmediate(cb, `Unknown transaction type ${transaction.type}`);
		}

		// Reject if transaction has requester public key
		if (transaction.requesterPublicKey) {
			return setImmediate(cb, 'Multisig request is not allowed');
		}

		// Check for missing sender second signature
		if (
			!transaction.requesterPublicKey &&
			sender.secondSignature &&
			!transaction.signSignature &&
			transaction.blockId !== this.scope.genesisBlock.block.id
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
			requester &&
			requester.secondSignature &&
			!transaction.signSignature
		) {
			return setImmediate(cb, 'Missing requester second signature');
		}

		// If second signature provided, check if requester has one enabled
		if (
			transaction.requesterPublicKey &&
			requester &&
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
			sender.publicKey === this.scope.genesisBlock.block.generatorPublicKey &&
			transaction.blockId !== this.scope.genesisBlock.block.id
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
		if ((requester && requester.secondSignature) || sender.secondSignature) {
			try {
				valid = false;
				valid = this.verifySecondSignature(
					transaction,
					(requester && requester.secondPublicKey) || sender.secondPublicKey,
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
		const fee = __private.types[transaction.type].calculateFee(
			transaction,
			sender
		);
		if (!transaction.fee.isEqualTo(fee)) {
			err = 'Invalid transaction fee';
			return setImmediate(cb, err);
		}

		// Check amount
		let amount = transaction.amount;
		if (
			!amount.isInteger() ||
			amount.isGreaterThan(POSTGRESQL_BIGINT_MAX_VALUE) ||
			amount.isLessThan(0)
		) {
			return setImmediate(cb, 'Invalid transaction amount');
		}

		// Check confirmed sender balance
		amount = amount.plus(transaction.fee);

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
		if (
			transaction.timestamp < INT_32_MIN ||
			transaction.timestamp > INT_32_MAX
		) {
			return setImmediate(
				cb,
				'Invalid transaction timestamp. Timestamp is not in the int32 range'
			);
		}
		if (slots.getSlotNumber(transaction.timestamp) > slots.getSlotNumber()) {
			return setImmediate(
				cb,
				'Invalid transaction timestamp. Timestamp is in the future'
			);
		}

		const verifyTransactionTypes = (
			transaction,
			sender,
			tx,
			verifyTransactionTypesCb
		) => {
			__private.types[transaction.type].verify(
				transaction,
				sender,
				err => {
					if (err) {
						return setImmediate(verifyTransactionTypesCb, err);
					}
					return setImmediate(verifyTransactionTypesCb);
				},
				tx
			);
		};

		if (checkExists) {
			this.checkConfirmed(transaction, (checkConfirmedErr, isConfirmed) => {
				if (checkConfirmedErr) {
					return setImmediate(cb, checkConfirmedErr);
				}

				if (isConfirmed) {
					return setImmediate(
						cb,
						`Transaction is already confirmed: ${transaction.id}`
					);
				}

				verifyTransactionTypes(transaction, sender, tx, cb);
			});
		} else {
			verifyTransactionTypes(transaction, sender, tx, cb);
		}
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
			const signatureBuffer = this.scope.ed.hexToBuffer(signature);
			const publicKeyBuffer = this.scope.ed.hexToBuffer(publicKey);

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
	 * Merges account into sender address, Calls `applyConfirmed` based on transaction type (privateTypes).
	 *
	 * @see {@link privateTypes}
	 * @param {transaction} transaction
	 * @param {block} block
	 * @param {account} sender
	 * @param {function} cb - Callback function
	 * @returns {SetImmediate} error
	 * @todo Add description for the params
	 */
	applyConfirmed(transaction, block, sender, cb, tx) {
		if (exceptions.inertTransactions.includes(transaction.id)) {
			this.scope.logger.debug('Inert transaction encountered');
			this.scope.logger.debug(JSON.stringify(transaction));
			return setImmediate(cb);
		}

		if (!this.ready(transaction, sender)) {
			return setImmediate(cb, 'Transaction is not ready');
		}

		// Check confirmed sender balance
		const amount = transaction.amount.plus(transaction.fee);

		const senderBalance = this.checkBalance(
			amount,
			'balance',
			transaction,
			sender
		);

		if (senderBalance.exceeded) {
			return setImmediate(cb, senderBalance.error);
		}

		this.scope.logger.trace('Logic/Transaction->applyConfirmed', {
			sender: sender.address,
			balance: `-${amount}`,
			blockId: block.id,
			round: slots.calcRound(block.height),
		});

		this.scope.account.merge(
			sender.address,
			{
				balance: `-${amount}`,
				round: slots.calcRound(block.height),
			},
			(mergeErr, sender) => {
				if (mergeErr) {
					return setImmediate(cb, mergeErr);
				}
				/**
				 * Calls applyConfirmed for Transfer, Signature, Delegate, Vote, Multisignature,
				 * DApp, InTransfer or OutTransfer.
				 */
				__private.types[transaction.type].applyConfirmed(
					transaction,
					block,
					sender,
					applyConfirmedErr => {
						if (applyConfirmedErr) {
							this.scope.account.merge(
								sender.address,
								{
									balance: amount,
									round: slots.calcRound(block.height),
								},
								reverseMergeErr =>
									setImmediate(cb, reverseMergeErr || applyConfirmedErr),
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
	undoConfirmed(transaction, block, sender, cb, tx) {
		if (exceptions.inertTransactions.includes(transaction.id)) {
			this.scope.logger.debug('Inert transaction encountered');
			this.scope.logger.debug(JSON.stringify(transaction));
			return setImmediate(cb);
		}

		const amount = transaction.amount.plus(transaction.fee);

		this.scope.logger.trace('Logic/Transaction->undoConfirmed', {
			sender: sender.address,
			balance: amount,
			blockId: block.id,
			round: slots.calcRound(block.height),
		});

		this.scope.account.merge(
			sender.address,
			{
				balance: amount,
				round: slots.calcRound(block.height),
			},
			(mergeErr, sender) => {
				if (mergeErr) {
					return setImmediate(cb, mergeErr);
				}

				__private.types[transaction.type].undoConfirmed(
					transaction,
					block,
					sender,
					undoConfirmedErr => {
						if (undoConfirmedErr) {
							this.scope.account.merge(
								sender.address,
								{
									balance: `-${amount}`,
									round: slots.calcRound(block.height),
								},
								reverseMergeErr =>
									setImmediate(cb, reverseMergeErr || undoConfirmedErr),
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

		if (exceptions.inertTransactions.includes(transaction.id)) {
			this.scope.logger.debug('Inert transaction encountered');
			this.scope.logger.debug(JSON.stringify(transaction));
			return setImmediate(cb);
		}

		// Check unconfirmed sender balance
		const amount = transaction.amount.plus(transaction.fee);

		const senderBalance = this.checkBalance(
			amount,
			'u_balance',
			transaction,
			sender
		);

		if (senderBalance.exceeded) {
			return setImmediate(cb, senderBalance.error);
		}

		this.scope.account.merge(
			sender.address,
			{ u_balance: `-${amount}` },
			(mergeErr, sender) => {
				if (mergeErr) {
					return setImmediate(cb, mergeErr);
				}

				__private.types[transaction.type].applyUnconfirmed(
					transaction,
					sender,
					applyUnconfirmedErr => {
						if (applyUnconfirmedErr) {
							this.scope.account.merge(
								sender.address,
								{ u_balance: amount },
								reverseMergeErr =>
									setImmediate(cb, reverseMergeErr || applyUnconfirmedErr),
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
		if (exceptions.inertTransactions.includes(transaction.id)) {
			this.scope.logger.debug('Inert transaction encountered');
			this.scope.logger.debug(JSON.stringify(transaction));
			return setImmediate(cb);
		}

		const amount = transaction.amount.plus(transaction.fee);

		this.scope.account.merge(
			sender.address,
			{ u_balance: amount },
			(mergeErr, sender) => {
				if (mergeErr) {
					return setImmediate(cb, mergeErr);
				}

				__private.types[transaction.type].undoUnconfirmed(
					transaction,
					sender,
					undoUnconfirmedErr => {
						if (undoUnconfirmedErr) {
							this.scope.account.merge(
								sender.address,
								{ u_balance: `-${amount}` },
								reverseMergeErr =>
									setImmediate(cb, reverseMergeErr || undoUnconfirmedErr),
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
			transaction.amount = new Bignum(transaction.amount);
		}

		if (transaction.fee) {
			transaction.fee = new Bignum(transaction.fee);
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
			transaction = __private.types[transaction.type].objectNormalize(
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
	/* eslint-disable class-methods-use-this */
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
			amount: new Bignum(raw.t_amount),
			fee: new Bignum(raw.t_fee),
			signature: raw.t_signature,
			signSignature: raw.t_signSignature,
			signatures: raw.t_signatures ? raw.t_signatures.split(',') : [],
			confirmations: parseInt(raw.confirmations),
			asset: {},
		};

		if (!__private.types[transaction.type]) {
			throw `Unknown transaction type ${transaction.type}`;
		}

		const asset = __private.types[transaction.type].dbRead(raw);

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
		typeof instance.applyConfirmed === 'function' &&
		typeof instance.undoConfirmed === 'function' &&
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
			type: 'object',
			format: 'amount',
		},
		fee: {
			type: 'object',
			format: 'amount',
		},
		signature: {
			type: 'string',
			format: 'signature',
		},
		signSignature: {
			type: 'string',
			format: 'signature',
		},
		signatures: {
			type: 'array',
			items: {
				type: 'string',
				format: 'signature',
			},
			uniqueItems: true,
		},
		asset: {
			type: 'object',
		},
	},
	required: ['type', 'timestamp', 'senderPublicKey', 'signature'],
};

module.exports = Transaction;
