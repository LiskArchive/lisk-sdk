'use strict';

var async = require('async');
var pgp = require('pg-promise');
var path = require('path');
var jsonSql = require('json-sql')();
jsonSql.setDialect('postgresql');
var constants = require('../helpers/constants.js');
var slots = require('../helpers/slots.js');
var orderBy = require('../helpers/orderBy.js');
var BlockReward = require('../logic/blockReward.js');
var Bignum = require('../helpers/bignum.js');

// Private fields
var self, library, modules, __private = {};

/**
 * Main account logic.
 * @memberof module:accounts
 * @class
 * @classdesc Main account logic.
 * @param {Database} db
 * @param {ZSchema} schema
 * @param {Object} logger
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} With `this` as data.
 */
function Account (db, schema, logger, cb) {
	this.scope = {
		db: db,
		schema: schema,
	};

	__private.blockReward = new BlockReward();

	self = this;
	library = {
		logger: logger,
	};

	this.table = 'accounts_list';
	/**
	 * @typedef {Object} account
	 * @property {string} username - Lowercase, between 1 and 20 chars.
	 * @property {address} address - Uppercase, between 1 and 22 chars.
	 * @property {publicKey} publicKey
	 * @property {publicKey} secondPublicKey
	 * @property {number} balance - Between 0 and totalAmount from constants.
	 * @property {number} votes
	 * @property {number} rank
	 * @property {number} multimin - Between 0 and 17.
	 * @property {number} multilifetime - Between 1 and 72.
	 * @property {number} vote
	 * @property {number} producedblocks - Between -1 and 1.
	 * @property {number} missedblocks - Between -1 and 1.
	 * @property {number} fees
	 * @property {number} rewards
	 */
	this.model = [
		{
			name: 'username',
			type: 'String',
			filter: {
				type: 'string',
				case: 'lower',
				maxLength: 20,
				minLength: 1
			},
			conv: String,
			immutable: true
		},
		{
			name: 'address',
			type: 'String',
			filter: {
				required: true,
				type: 'string',
				case: 'upper',
				minLength: 1,
				maxLength: 22
			},
			conv: String,
			immutable: true,
			expression: 'UPPER(a.address)'
		},
		{
			name: 'publicKey',
			type: 'Binary',
			filter: {
				type: 'string',
				format: 'publicKey'
			},
			conv: String,
			immutable: true,
			expression: 'ENCODE("publicKey", \'hex\')'
		},
		{
			name: 'secondPublicKey',
			type: 'Binary',
			filter: {
				type: 'string',
				format: 'publicKey'
			},
			conv: String,
			immutable: true,
			expression: 'ENCODE("secondPublicKey", \'hex\')'
		},
		{
			name: 'balance',
			type: 'BigInt',
			filter: {
				required: true,
				type: 'integer',
				minimum: 0,
				maximum: constants.totalAmount
			},
			conv: Number,
			expression: '("balance")::bigint'
		},
		{
			name: 'votes',
			type: 'BigInt',
			filter: {
				required: true,
				type: 'integer',
				minimum: 0,
				maximum: constants.activeDelegates
			},
			conv: Number,
			expression: '("votes")::int'
		},
		{
			name: 'voters',
			type: 'BigInt',
			filter: {
				type: 'integer'
			},
			conv: Number,
			expression: '("voters")::int'
		},
		{
			name: 'delegates',
			type: 'Text',
			filter: {
				type: 'array',
				uniqueItems: true
			},
			conv: Array,
			expression: '(SELECT ARRAY_AGG(ENCODE(v.delegate_public_key, \'hex\')) AS "delegates" FROM (SELECT DISTINCT ON (delegate_public_key) voter_address, delegate_public_key, type FROM votes_details WHERE voter_address = a."address" ORDER BY delegate_public_key, timestamp DESC) v WHERE v.type = \'add\')'
		},
		{
			name: 'multisignatures',
			type: 'Text',
			filter: {
				type: 'array',
				uniqueItems: true
			},
			conv: Array,
			expression: '(SELECT ARRAY_AGG(ENCODE(mm."public_key", \'hex\')) FROM multisignatures_member mm, accounts a WHERE a."public_key" = mm."master_public_key")'
		},
		{
			name: 'multimin',
			type: 'SmallInt',
			filter: {
				type: 'integer',
				minimum: 0,
				maximum: 17
			},
			conv: Number
		},
		{
			name: 'multilifetime',
			type: 'SmallInt',
			filter: {
				type: 'integer',
				minimum: 1,
				maximum: 72
			},
			conv: Number
		},
		{
			name: 'fees',
			type: 'BigInt',
			filter: {
				type: 'integer'
			},
			conv: Number,
			expression: '(a."fees")::bigint'
		},
		{
			name: 'rank',
			type: 'BigInt',
			filter: {
				type: 'integer'
			},
			conv: Number,
			expression: '(d."rank")::bigint'
		},
		{
			name: 'rewards',
			type: 'BigInt',
			filter: {
				type: 'integer'
			},
			conv: Number,
			expression: '(d."rewards")::bigint'
		},
		{
			name: 'vote',
			type: 'BigInt',
			filter: {
				type: 'integer'
			},
			conv: Number,
			expression: '(d."voters_balance")::bigint'
		},
		{
			name: 'producedBlocks',
			type: 'BigInt',
			conv: Number,
			expression: '(d."blocks_forged_count")::bigint'
		},
		{
			name: 'missedBlocks',
			type: 'BigInt',
			conv: Number,
			expression: '(d."blocks_missed_count")::bigint'
		},
		{
			name: 'approval',
			type: 'integer',
			dependentFields: [
				'vote'
			],
			computedField: true
		},
		{
			name: 'productivity',
			type: 'integer',
			dependentFields: [
				'producedBlocks',
				'missedBlocks',
				'rank'
			],
			computedField: true
		}
	];

	this.computedFields = this.model.filter(function (field) {
		return field.computedField;
	});

	// Obtains fields from model
	this.fields = this.model.map(function (field) {
		var _tmp = {};

		if (field.expression) {
			_tmp.expression = field.expression;
		} else {
			if (field.mod) {
				_tmp.expression = field.mod;
			}
			_tmp.field = field.name;
		}
		if (_tmp.expression || field.alias) {
			_tmp.alias = field.alias || field.name;
		}

		_tmp.computedField = field.computedField || false;

		return _tmp;
	});

	// Obtains bynary fields from model
	this.binary = [];
	this.model.forEach(function (field) {
		if (field.type === 'Binary') {
			this.binary.push(field.name);
		}
	}.bind(this));

	// Obtains filters from model
	this.filter = {};
	this.model.forEach(function (field) {
		this.filter[field.name] = field.filter;
	}.bind(this));

	// Obtains conv from model
	this.conv = {};
	this.model.forEach(function (field) {
		this.conv[field.name] = field.conv;
	}.bind(this));

	// Obtains editable fields from model
	this.editable = [];
	this.model.forEach(function (field) {
		if (!field.immutable) {
			this.editable.push(field.name);
		}
	}.bind(this));

	return setImmediate(cb, null, this);
}

// Public methods
/**
 * Binds input parameters to private variables modules.
 * @param {Blocks} blocks
 */
Account.prototype.bind = function (blocks) {
	modules = {
		blocks: blocks,
	};
};

/**
 * Creates memory tables related to accounts:
 * - mem_accounts
 * - mem_accounts2delegates
 * - mem_accounts2u_delegates
 * - mem_accounts2multisignatures
 * - mem_accounts2u_multisignatures
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} cb|error.
 */
Account.prototype.createTables = function (cb) {
	var sql = new pgp.QueryFile(path.join(process.cwd(), 'sql', 'memoryTables.sql'), {minify: true});

	this.scope.db.query(sql).then(function () {
		return setImmediate(cb);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Account#createTables error');
	});
};

/**
 * Deletes the contents of these tables:
 * - mem_accounts2delegates
 * - mem_accounts2u_delegates
 * - mem_accounts2multisignatures
 * - mem_accounts2u_multisignatures
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} cb|error.
 */
Account.prototype.removeTables = function (cb) {
	var sqles = [], sql;

	[this.table,
		'mem_accounts2delegates',
		'mem_accounts2u_delegates',
		'mem_accounts2multisignatures',
		'mem_accounts2u_multisignatures'].forEach(function (table) {
		sql = jsonSql.build({
			type: 'remove',
			table: table
		});
		sqles.push(sql.query);
	});

	this.scope.db.query(sqles.join('')).then(function () {
		return setImmediate(cb);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Account#removeTables error');
	});
};

/**
 * Validates account schema.
 * @param {account} account
 * @returns {err|account} Error message or input parameter account.
 * @throws {string} If schema.validate fails, throws 'Failed to validate account schema'.
 */
Account.prototype.objectNormalize = function (account) {
	var report = this.scope.schema.validate(account, {
		id: 'Account',
		object: true,
		properties: this.filter
	});

	if (!report) {
		throw 'Failed to validate account schema: ' + this.scope.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return account;
};

/**
 * Checks type, lenght and format from publicKey.
 * @param {publicKey} publicKey
 * @throws {string} throws one error for every check.
 */
Account.prototype.verifyPublicKey = function (publicKey) {
	if (publicKey !== undefined) {
		// Check type
		if (typeof publicKey !== 'string') {
			throw 'Invalid public key, must be a string';
		}
		// Check length
		if (publicKey.length !== 64) {
			throw 'Invalid public key, must be 64 characters long';
		}

		if (!this.scope.schema.validate(publicKey, { format: 'hex' })) {
			throw 'Invalid public key, must be a hex string';
		}
	}
};

/**
 * Normalizes address and creates binary buffers to insert.
 * @param {Object} raw - with address and public key.
 * @returns {Object} Normalized address.
 */
Account.prototype.toDB = function (raw) {
	this.binary.forEach(function (field) {
		if (raw[field]) {
			raw[field] = Buffer.from(raw[field], 'hex');
		}
	});

	// Normalize address
	raw.address = String(raw.address).toUpperCase();

	return raw;
};

/**
 * Gets account information for specified fields and filter criteria.
 * @param {Object} filter - Contains address.
 * @param {Object|function} fields - Table fields.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} Returns null or Object with database data.
 */
Account.prototype.get = function (filter, fields, cb) {
	if (typeof(fields) === 'function') {
		cb = fields;
		fields = this.fields.map(function (field) {
			return field.alias || field.field;
		});
	}

	this.getAll(filter, fields, function (err, data) {
		return setImmediate(cb, err, data && data.length ? data[0] : null);
	});
};

/**
 * Gets accounts information from mem_accounts.
 * @param {Object} filter - Contains address.
 * @param {Object|function} fields - Table fields.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} data with rows | 'Account#getAll error'.
 */
Account.prototype.getAll = function (filter, fields, cb) {
	if (typeof fields === 'function') {
		cb = fields;
		fields = this.fields.map(function (field) {
			return field.alias || field.field;
		});
	}

	var fieldsAddedForComputation = [];
	this.computedFields.forEach(function (field) {
		if (fields.indexOf(field.name) !== -1) {
			field.dependentFields.forEach(function (dependentField) {
				if (fields.indexOf(dependentField) == -1) {
					// Add the dependent field to the fields array if it's required.
					fieldsAddedForComputation.push(dependentField);
					fields.push(dependentField);
				}
			});
		}
	});

	var realFields = this.fields.filter(function (field) {
		return !field.computedField && fields.indexOf(field.alias || field.field) !== -1;
	});

	var realConv = {};
	Object.keys(this.conv).forEach(function (key) {
		if (fields.indexOf(key) !== -1) {
			realConv[key] = this.conv[key];
		}
	}.bind(this));

	var DEFAULT_LIMIT = constants.activeDelegates;
	var limit, offset, sort;


	if (filter.offset > 0) {
		offset = filter.offset;
	}
	delete filter.offset;

	if (filter.limit > 0) {
		limit = filter.limit;
	}

	// Assigning a default value if none is present.
	if (!limit) {
		limit = DEFAULT_LIMIT;
	}

	delete filter.limit;

	if (filter.sort) {
		sort = orderBy.sortQueryToJsonSqlFormat(filter.sort, ['username', 'balance']);
	}
	delete filter.sort;

	if (filter.address) {
		if (typeof filter.address === 'string') {
			filter['a.address'] = {
				$upper: ['a.address', filter.address]
			};
		} else {
			// If we want to get addresses by id
			filter['a.address'] = filter.address;
		}
		delete filter.address;
	}

	if (typeof filter.publicKey === 'string') {
		filter.publicKey = {
			$decode: ['publicKey', filter.publicKey, 'hex']
		};
	}

	if (typeof filter.secondPublicKey === 'string') {
		filter.secondPublicKey = {
			$decode: ['secondPublicKey', filter.secondPublicKey, 'hex']
		};
	}

	var sql = jsonSql.build({
		type: 'select',
		table: this.table,
		limit: limit,
		offset: offset,
		sort: sort,
		condition: filter,
		fields: realFields,
		alias: 'a',
		join: {
			delegates: {
				type: 'left',
				on: {
					'a.address': 'd.address'
				},
				alias: 'd'
			}
		}
	});
	
	var self = this;

	this.scope.db.query(sql.query, sql.values).then(function (rows) {
		var lastBlock = modules.blocks.lastBlock.get();
		// If the last block height is undefined, it means it's a genesis block with height = 1
		// look for a constant for total supply
		var totalSupply = lastBlock.height ? __private.blockReward.calcSupply(lastBlock.height) : 0;

		if (fields.indexOf('approval') !== -1) {
			rows.forEach(function (accountRow) {
				accountRow.approval = self.calculateApproval(accountRow.vote, totalSupply);
			});
		}

		if (fields.indexOf('productivity') !== -1) {
			rows.forEach(function (accountRow) {
				accountRow.productivity = self.calculateProductivity(accountRow.producedBlocks, accountRow.missedBlocks);
			});
		}

		if (fieldsAddedForComputation.length > 0) {
			// Remove the fields which were only added for computation
			rows.forEach(function (accountRow) {
				fieldsAddedForComputation.forEach(function (field) {
					delete accountRow[field];
				});
			});
		}

		return setImmediate(cb, null, rows);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Account#getAll error');
	});
};

/**
 * Calculates productivity of a delegate account.
 * @param {String} votersBalance
 * @param {String} totalSupply
 * @returns {Number}
 */
Account.prototype.calculateApproval = function (votersBalance, totalSupply) {
	// votersBalance and totalSupply are sent as strings, we convert them into bignum and send the response as number as well.
	var votersBalanceBignum = new Bignum(votersBalance || 0);
	var totalSupplyBignum =  new Bignum(totalSupply);
	var approvalBignum = (votersBalanceBignum.dividedBy(totalSupplyBignum)).times(100).round(2);
	return !(approvalBignum.isNaN()) ? approvalBignum.toNumber() : 0;
};

/**
 * Calculates productivity of a delegate account.
 * @param {String} producedBlocks
 * @param {String} missedBlocks
 * @returns {Number}
 */
Account.prototype.calculateProductivity = function (producedBlocks, missedBlocks) {
	var producedBlocksBignum = new Bignum(producedBlocks || 0);
	var missedBlocksBignum = new Bignum(missedBlocks || 0);
	var percent = producedBlocksBignum.dividedBy(producedBlocksBignum.plus(missedBlocksBignum)).times(100).round(2);
	return !(percent.isNaN()) ? percent.toNumber() : 0;
};

/**
 * Removes an account from mem_account table based on address.
 * @param {address} address
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} Data with address | Account#remove error.
 */
// TODO: Completely deprecated, DB Handles
Account.prototype.remove = function (address, cb) {
	var sql = jsonSql.build({
		type: 'remove',
		table: this.table,
		condition: {
			address: address
		}
	});
	this.scope.db.none(sql.query, sql.values).then(function () {
		return setImmediate(cb, null, address);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Account#remove error');
	});
};

// Export
module.exports = Account;
