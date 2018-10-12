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

const valid_url = require('valid-url');
const ByteBuffer = require('bytebuffer');
const dappCategories = require('../helpers/dapp_categories.js');
const Bignum = require('../helpers/bignum.js');

let library;
const { FEES } = global.constants;
const __private = {};

__private.unconfirmedNames = {};
__private.unconfirmedLinks = {};
__private.unconfirmedAscii = {};

/**
 * Main dapp logic. Initializes library.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires bytebuffer
 * @requires valid
 * @requires helpers/dapp_categories
 * @param {Database} db
 * @param {Object} logger
 * @param {ZSchema} schema
 * @param {Object} network
 * @todo Add description for the params
 */
class DApp {
	constructor(db, logger, schema, network) {
		library = {
			db,
			logger,
			schema,
			network,
		};
	}
}

// TODO: The below functions should be converted into static functions,
// however, this will lead to incompatibility with modules and tests implementation.
/**
 * Binds scope.modules to private variable modules.
 */
DApp.prototype.bind = function() {};

/**
 * Returns dapp fee from constants.
 *
 * @returns {Bignumber} Transaction fee
 */
DApp.prototype.calculateFee = function() {
	return new Bignum(FEES.DAPP_REGISTRATION);
};

/**
 * Verifies transaction and dapp fields. Checks dapp name and link in
 * `dapps` table.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate} error, transaction
 * @todo Add description for the params
 */
DApp.prototype.verify = function(transaction, sender, cb, tx) {
	if (transaction.recipientId) {
		return setImmediate(cb, 'Invalid recipient');
	}

	const amount = new Bignum(transaction.amount);
	if (amount.isGreaterThan(0)) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	if (!transaction.asset || !transaction.asset.dapp) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	if (
		transaction.asset.dapp.category !== 0 &&
		!transaction.asset.dapp.category
	) {
		return setImmediate(cb, 'Invalid application category');
	}

	let foundCategory = false;
	for (const i of Object.keys(dappCategories)) {
		if (dappCategories[i] === transaction.asset.dapp.category) {
			foundCategory = true;
			break;
		}
	}

	if (!foundCategory) {
		return setImmediate(cb, 'Application category not found');
	}

	if (transaction.asset.dapp.icon) {
		if (!valid_url.isUri(transaction.asset.dapp.icon)) {
			return setImmediate(cb, 'Invalid application icon link');
		}

		const length = transaction.asset.dapp.icon.length;

		if (
			transaction.asset.dapp.icon.indexOf('.png') !== length - 4 &&
			transaction.asset.dapp.icon.indexOf('.jpg') !== length - 4 &&
			transaction.asset.dapp.icon.indexOf('.jpeg') !== length - 5
		) {
			return setImmediate(cb, 'Invalid application icon file type');
		}
	}

	if (transaction.asset.dapp.type > 1 || transaction.asset.dapp.type < 0) {
		return setImmediate(cb, 'Invalid application type');
	}

	if (!valid_url.isUri(transaction.asset.dapp.link)) {
		return setImmediate(cb, 'Invalid application link');
	}

	if (
		transaction.asset.dapp.link.indexOf('.zip') !==
		transaction.asset.dapp.link.length - 4
	) {
		return setImmediate(cb, 'Invalid application file type');
	}

	if (
		!transaction.asset.dapp.name ||
		transaction.asset.dapp.name.trim().length === 0 ||
		transaction.asset.dapp.name.trim() !== transaction.asset.dapp.name
	) {
		return setImmediate(cb, 'Application name must not be blank');
	}

	if (transaction.asset.dapp.name.length > 32) {
		return setImmediate(
			cb,
			'Application name is too long. Maximum is 32 characters'
		);
	}

	if (
		transaction.asset.dapp.description &&
		transaction.asset.dapp.description.length > 160
	) {
		return setImmediate(
			cb,
			'Application description is too long. Maximum is 160 characters'
		);
	}

	if (transaction.asset.dapp.tags && transaction.asset.dapp.tags.length > 160) {
		return setImmediate(
			cb,
			'Application tags is too long. Maximum is 160 characters'
		);
	}

	if (transaction.asset.dapp.tags) {
		let tags = transaction.asset.dapp.tags.split(',');

		tags = tags.map(tag => tag.trim()).sort();

		for (let i = 0; i < tags.length - 1; i++) {
			if (tags[i + 1] === tags[i]) {
				return setImmediate(
					cb,
					`Encountered duplicate tag: ${tags[i]} in application`
				);
			}
		}
	}

	(tx || library.db).dapps
		.getExisting({
			name: transaction.asset.dapp.name,
			link: transaction.asset.dapp.link || null,
			transactionId: transaction.id,
		})
		.then(rows => {
			const dapp = rows[0];

			if (dapp) {
				if (dapp.name === transaction.asset.dapp.name) {
					return setImmediate(
						cb,
						`Application name already exists: ${dapp.name}`
					);
				} else if (dapp.link === transaction.asset.dapp.link) {
					return setImmediate(
						cb,
						`Application link already exists: ${dapp.link}`
					);
				}
				return setImmediate(cb, 'Application already exists');
			}
			return setImmediate(cb, null, transaction);
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'DApp#verify error');
		});
};

/**
 * Description of the function.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate} null, transaction
 * @todo Add description for the function and the params
 */
DApp.prototype.process = function(transaction, sender, cb) {
	return setImmediate(cb, null, transaction);
};

/**
 * Creates a buffer with dapp information:
 * - name
 * - description
 * - tags
 * - link
 * - icon
 * - type
 * - category
 *
 * @param {transaction} transaction
 * @throws {Error}
 * @returns {Array} Buffer
 * @todo Add description for the params
 * @todo Check type and description of the return value
 */
DApp.prototype.getBytes = function(transaction) {
	let buf;

	try {
		buf = Buffer.from([]);
		const nameBuf = Buffer.from(transaction.asset.dapp.name, 'utf8');
		buf = Buffer.concat([buf, nameBuf]);

		if (transaction.asset.dapp.description) {
			const descriptionBuf = Buffer.from(
				transaction.asset.dapp.description,
				'utf8'
			);
			buf = Buffer.concat([buf, descriptionBuf]);
		}

		if (transaction.asset.dapp.tags) {
			const tagsBuf = Buffer.from(transaction.asset.dapp.tags, 'utf8');
			buf = Buffer.concat([buf, tagsBuf]);
		}

		if (transaction.asset.dapp.link) {
			buf = Buffer.concat([
				buf,
				Buffer.from(transaction.asset.dapp.link, 'utf8'),
			]);
		}

		if (transaction.asset.dapp.icon) {
			buf = Buffer.concat([
				buf,
				Buffer.from(transaction.asset.dapp.icon, 'utf8'),
			]);
		}

		const byteBuffer = new ByteBuffer(4 + 4, true);
		byteBuffer.writeInt(transaction.asset.dapp.type);
		byteBuffer.writeInt(transaction.asset.dapp.category);
		byteBuffer.flip();

		buf = Buffer.concat([buf, byteBuffer.toBuffer()]);
	} catch (e) {
		throw e;
	}

	return buf;
};

/**
 * Description of the function.
 *
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate}
 * @todo Add description for the function and the params
 */
DApp.prototype.applyConfirmed = function(transaction, block, sender, cb) {
	delete __private.unconfirmedNames[transaction.asset.dapp.name];
	delete __private.unconfirmedLinks[transaction.asset.dapp.link];

	return setImmediate(cb);
};

/**
 * Description of the function.
 *
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate}
 * @todo Add description for the function and the params
 */
DApp.prototype.undoConfirmed = function(transaction, block, sender, cb) {
	return setImmediate(cb);
};

/**
 * Checks if dapp name and link exists, if not adds them to private
 * unconfirmed variables.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate} error
 * @todo Add description for the params
 */
DApp.prototype.applyUnconfirmed = function(transaction, sender, cb) {
	if (__private.unconfirmedNames[transaction.asset.dapp.name]) {
		return setImmediate(cb, 'Application name already exists');
	}

	if (
		transaction.asset.dapp.link &&
		__private.unconfirmedLinks[transaction.asset.dapp.link]
	) {
		return setImmediate(cb, 'Application link already exists');
	}

	__private.unconfirmedNames[transaction.asset.dapp.name] = true;
	__private.unconfirmedLinks[transaction.asset.dapp.link] = true;

	return setImmediate(cb);
};

/**
 * Deletes dapp name and link from private unconfirmed variables.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate}
 * @todo Add description for the params
 */
DApp.prototype.undoUnconfirmed = function(transaction, sender, cb) {
	delete __private.unconfirmedNames[transaction.asset.dapp.name];
	delete __private.unconfirmedLinks[transaction.asset.dapp.link];

	return setImmediate(cb);
};

/**
 * @typedef {Object} dapp
 * @property {dappCategory} category - Number between 0 and 8
 * @property {string} name - Between 1 and 32 chars
 * @property {string} description - Between 0 and 160 chars
 * @property {string} tags - Between 0 and 160 chars
 * @property {dappType} type - Number, minimum 0
 * @property {string} link - Between 0 and 2000 chars
 * @property {string} icon - Between 0 and 2000 chars
 * @property {string} transactionId - Transaction id
 */
DApp.prototype.schema = {
	id: 'DApp',
	type: 'object',
	properties: {
		category: {
			type: 'integer',
			minimum: 0,
			maximum: 8,
		},
		name: {
			type: 'string',
			minLength: 1,
			maxLength: 32,
		},
		description: {
			type: 'string',
			minLength: 0,
			maxLength: 160,
		},
		tags: {
			type: 'string',
			minLength: 0,
			maxLength: 160,
		},
		type: {
			type: 'integer',
			minimum: 0,
		},
		link: {
			type: 'string',
			minLength: 0,
			maxLength: 2000,
		},
		icon: {
			type: 'string',
			minLength: 0,
			maxLength: 2000,
		},
	},
	required: ['type', 'name', 'category'],
};

/**
 * Deletes null or undefined dapp from transaction and validate dapp schema.
 *
 * @param {transaction} transaction
 * @throws {string} If dapp schema is invalid
 * @returns {transaction}
 * @todo Add description for the params
 */
DApp.prototype.objectNormalize = function(transaction) {
	for (const i of Object.keys(transaction.asset.dapp)) {
		if (
			transaction.asset.dapp[i] === null ||
			typeof transaction.asset.dapp[i] === 'undefined'
		) {
			delete transaction.asset.dapp[i];
		}
	}

	const report = library.schema.validate(
		transaction.asset.dapp,
		DApp.prototype.schema
	);

	if (!report) {
		throw `Failed to validate dapp schema: ${library.schema
			.getLastErrors()
			.map(err => err.message)
			.join(', ')}`;
	}

	return transaction;
};

/**
 * Creates dapp object based on raw data.
 *
 * @param {Object} raw
 * @returns {null|Object} Dapp object
 * @todo Add description for the params
 */
DApp.prototype.dbRead = function(raw) {
	if (!raw.dapp_name) {
		return null;
	}
	const dapp = {
		name: raw.dapp_name,
		description: raw.dapp_description,
		tags: raw.dapp_tags,
		type: raw.dapp_type,
		link: raw.dapp_link,
		category: raw.dapp_category,
		icon: raw.dapp_icon,
	};

	return { dapp };
};

/**
 * Emits 'dapps/change' signal.
 *
 * @param {transaction} transaction
 * @param {function} cb
 * @returns {SetImmediate}
 * @todo Add description for the params
 */
DApp.prototype.afterSave = function(transaction, cb) {
	if (library) {
		library.network.io.sockets.emit('dapps/change', {});
	}
	return setImmediate(cb);
};

/**
 * Checks if transaction has enough signatures to be confirmed.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @returns {boolean} true - If transaction signatures greather than sender multimin, or there are no sender multisignatures
 * @todo Add description for the params
 */
DApp.prototype.ready = function(transaction, sender) {
	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		if (!Array.isArray(transaction.signatures)) {
			return false;
		}
		return transaction.signatures.length >= sender.multimin;
	}
	return true;
};

module.exports = DApp;
