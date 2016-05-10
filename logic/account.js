var async = require('async');
var jsonSql = require('json-sql')();
jsonSql.setDialect("sqlite")
var constants = require('../helpers/constants.js');
var slots = require('../helpers/slots.js');
var genesisBlock = null;

var private = {};

// Constructor
function Account(scope, cb) {
	this.scope = scope;
	genesisBlock = this.scope.genesisblock.block;

	this.table = "mem_accounts";

	this.model = [
		{
			name: "username",
			type: "String",
			length: 20,
			filter: {
				type: "string",
				case: "lower",
				maxLength: 20,
				minLength: 1
			},
			conv: String,
			constante: true
		},
		{
			name: "isDelegate",
			type: "BigInt",
			filter: {
				type: "boolean"
			},
			conv: Boolean,
			default: 0
		},
		{
			name: "u_isDelegate",
			type: "BigInt",
			filter: {
				type: "boolean"
			},
			conv: Boolean,
			default: 0
		},
		{
			name: "secondSignature",
			type: "BigInt",
			filter: {
				type: "boolean"
			},
			conv: Boolean,
			default: 0
		},
		{
			name: "u_secondSignature",
			type: "BigInt",
			filter: {
				type: "boolean"
			},
			conv: Boolean,
			default: 0
		},
		{
			name: "u_username",
			type: "String",
			length: 20,
			filter: {
				type: "string",
				case: "lower",
				maxLength: 20
			},
			conv: String,
			constante: true
		},
		{
			name: "address",
			type: "String",
			length: 21,
			not_null: true,
			unique: true,
			primary_key: true,
			filter: {
				required: true,
				type: "string",
				minLength: 1,
				maxLength: 21
			},
			conv: String,
			constante: true
		},
		{
			name: "publicKey",
			type: "Binary",
			length: 32,
			filter: {
				type: "string",
				format: "publicKey"
			},
			conv: String,
			constante: true
		},
		{
			name: "secondPublicKey",
			type: "Binary",
			length: 32,
			filter: {
				type: "string",
				format: "publicKey"
			},
			conv: String,
			constante: true
		},
		{
			name: "balance",
			type: "BigInt",
			filter: {
				required: true,
				type: "integer",
				minimum: 0,
				maximum: constants.totalAmount
			},
			conv: Number,
			default: 0
		},
		{
			name: "u_balance",
			type: "BigInt",
			filter: {
				required: true,
				type: "integer",
				minimum: 0,
				maximum: constants.totalAMount
			},
			conv: Number,
			default: 0
		},
		{
			name: "vote",
			type: "BigInt",
			filter: {
				type: "integer"
			},
			conv: Number,
			default: 0
		},
		{
			name: "rate",
			type: "BigInt",
			filter: {
				type: "integer"
			},
			conv: Number,
			default: 0
		},
		{
			name: "delegates",
			type: "Text",
			filter: {
				type: "array",
				uniqueItems: true
			},
			conv: Array,
			expression: "(select GROUP_CONCAT(dependentId) from " + this.table + "2delegates where accountId = a.address)"
		},
		{
			name: "contacts",
			type: "Text",
			filter: {
				type: "array",
				uniqueItems: true
			},
			conv: Array,
			expression: "(select GROUP_CONCAT(dependentId) from " + this.table + "2contacts where accountId = a.address)"
		},
		{
			name: "followers",
			type: "Text",
			filter: {
				type: "array",
				uniqueItems: true
			},
			conv: Array,
			expression: "(select GROUP_CONCAT(accountId) from " + this.table + "2contacts where dependentId = a.address)",
			readonly: true
		},
		{
			name: "u_delegates",
			type: "Text",
			filter: {
				type: "array",
				uniqueItems: true
			},
			conv: Array,
			expression: "(select GROUP_CONCAT(dependentId) from " + this.table + "2u_delegates where accountId = a.address)"
		},
		{
			name: "u_contacts",
			type: "Text",
			filter: {
				type: "array",
				uniqueItems: true
			},
			conv: Array,
			expression: "(select GROUP_CONCAT(dependentId) from " + this.table + "2u_contacts where accountId = a.address)"
		},
		{
			name: "u_followers",
			type: "Text",
			filter: {
				type: "array",
				uniqueItems: true
			},
			conv: Array,
			expression: "(select GROUP_CONCAT(accountId) from " + this.table + "2u_contacts where dependentId = a.address)",
			readonly: true
		},
		{
			name: "multisignatures",
			type: "Text",
			filter: {
				type: "array",
				uniqueItems: true
			},
			conv: Array,
			expression: "(select GROUP_CONCAT(dependentId) from " + this.table + "2multisignatures where accountId = a.address)"
		},
		{
			name: "u_multisignatures",
			type: "Text",
			filter: {
				type: "array",
				uniqueItems: true
			},
			conv: Array,
			expression: "(select GROUP_CONCAT(dependentId) from " + this.table + "2u_multisignatures where accountId = a.address)"
		},
		{
			name: "multimin",
			type: "BigInt",
			filter: {
				type: "integer",
				minimum: 0,
				maximum: 17
			},
			conv: Number,
			default: 0
		},
		{
			name: "u_multimin",
			type: "BigInt",
			filter: {
				type: "integer",
				minimum: 0,
				maximum: 17
			},
			conv: Number,
			default: 0
		},
		{
			name: "multilifetime",
			type: "BigInt",
			filter: {
				type: "integer",
				minimum: 1,
				maximum: 72
			},
			conv: Number,
			default: 0
		},
		{
			name: "u_multilifetime",
			type: "BigInt",
			filter: {
				type: "integer",
				minimum: 1,
				maximum: 72
			},
			conv: Number,
			default: 0
		},
		{
			name: "blockId",
			type: "String",
			length: 20,
			filter: {
				type: "string",
				minLength: 1,
				maxLength: 20
			},
			conv: String,
			default: genesisBlock.id
		},
		{
			name: "nameexist",
			type: "Boolean",
			filter: {
				type: "boolean"
			},
			conv: Boolean,
			default: 0
		},
		{
			name: "u_nameexist",
			type: "Boolean",
			filter: {
				type: "boolean"
			},
			conv: Boolean,
			default: 0
		},
		{
			name: "producedblocks",
			type: "BigInt",
			filter: {
				type: "integer",
				minimum: -1,
				maximum: 1
			},
			conv: Number,
			default: 0
		},
		{
			name: "missedblocks",
			type: "BigInt",
			filter: {
				type: "integer",
				minimum: -1,
				maximum: 1
			},
			conv: Number,
			default: 0
		},
		{
			name: "virgin",
			type: "Boolean",
			filter: {
				type: "boolean"
			},
			conv: Boolean,
			expression: "0"
		},
		{
			name: "fees",
			type: "BigInt",
			filter: {
				type: "integer"
			},
			conv: Number,
			default: 0
		},
		{
			name: "rewards",
			type: "BigInt",
			filter: {
				type: "integer"
			},
			conv: Number,
			default: 0
		}
	];

	this.fields = this.model.map(function (field) {
		var _tmp = {};
		if (field.type == "Binary") {
			_tmp.expression = ['lower', 'hex'];
		}

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

		return _tmp;
	});

	this.binary = [];
	this.model.forEach(function (field) {
		if (field.type == "Binary") {
			this.binary.push(field.name);
		}
	}.bind(this));

	this.filter = {};
	this.model.forEach(function (field) {
		this.filter[field.name] = field.filter;
	}.bind(this));

	this.conv = {};
	this.model.forEach(function (field) {
		this.conv[field.name] = field.conv;
	}.bind(this));

	this.editable = [];
	this.model.forEach(function (field) {
		if (!field.constante && !field.readonly) {
			this.editable.push(field.name);
		}
	}.bind(this));

	setImmediate(cb, null, this);
}

Account.prototype.createTables = function (cb) {
	var scope = this.scope;
	var sqles = [];

	var sql = jsonSql.build({
		type: 'create',
		table: this.table,
		tableFields: this.model
	});
	sqles.push(sql.query);

	var sql = jsonSql.build({
		type: 'create',
		table: "mem_round",
		tableFields: [
			{
				"name": "address",
				"type": "String",
				"length": 21
			},
			{
				"name": "amount",
				"type": "BigInt"
			},
			{
				"name": "delegate",
				"type": "String",
				"length": 64
			},
			{
				"name": "blockId",
				"type": "String",
				"length": 20
			},
			{
				"name": "round",
				"type": "BigInt"
			}
		]
	});
	sqles.push(sql.query);

	var sql = jsonSql.build({
		type: 'create',
		table: this.table + "2delegates",
		tableFields: [
			{
				name: "accountId",
				type: "String",
				length: 21,
				not_null: true
			}, {
				name: "dependentId",
				type: "String",
				length: 21,
				not_null: true
			}
		],
		foreignKeys: [
			{
				field: "accountId",
				table: this.table,
				table_field: "address",
				on_delete: "cascade"
			}
		]
	});
	sqles.push(sql.query);

	var sql = jsonSql.build({
		type: 'create',
		table: this.table + "2contacts",
		tableFields: [
			{
				name: "accountId",
				type: "String",
				length: 21,
				not_null: true
			}, {
				name: "dependentId",
				type: "String",
				length: 21,
				not_null: true
			}
		],
		foreignKeys: [
			{
				field: "accountId",
				table: this.table,
				table_field: "address",
				on_delete: "cascade"
			}
		]
	});
	sqles.push(sql.query);

	var sql = jsonSql.build({
		type: 'create',
		table: this.table + "2u_delegates",
		tableFields: [
			{
				name: "accountId",
				type: "String",
				length: 21,
				not_null: true
			}, {
				name: "dependentId",
				type: "String",
				length: 21,
				not_null: true
			}
		],
		foreignKeys: [
			{
				field: "accountId",
				table: this.table,
				table_field: "address",
				on_delete: "cascade"
			}
		]
	});
	sqles.push(sql.query);

	var sql = jsonSql.build({
		type: 'create',
		table: this.table + "2u_contacts",
		tableFields: [
			{
				name: "accountId",
				type: "String",
				length: 21,
				not_null: true
			}, {
				name: "dependentId",
				type: "String",
				length: 21,
				not_null: true
			}
		],
		foreignKeys: [
			{
				field: "accountId",
				table: this.table,
				table_field: "address",
				on_delete: "cascade"
			}
		]
	});
	sqles.push(sql.query);

	var sql = jsonSql.build({
		type: 'create',
		table: this.table + "2multisignatures",
		tableFields: [
			{
				name: "accountId",
				type: "String",
				length: 21,
				not_null: true
			}, {
				name: "dependentId",
				type: "String",
				length: 21,
				not_null: true
			}
		],
		foreignKeys: [
			{
				field: "accountId",
				table: this.table,
				table_field: "address",
				on_delete: "cascade"
			}
		]
	});
	sqles.push(sql.query);

	var sql = jsonSql.build({
		type: 'create',
		table: this.table + "2u_multisignatures",
		tableFields: [
			{
				name: "accountId",
				type: "String",
				length: 21,
				not_null: true
			}, {
				name: "dependentId",
				type: "String",
				length: 21,
				not_null: true
			}
		],
		foreignKeys: [
			{
				field: "accountId",
				table: this.table,
				table_field: "address",
				on_delete: "cascade"
			}
		]
	});
	sqles.push(sql.query);

	sqles.push("delete from mem_accounts2u_contacts;");
	sqles.push("delete from mem_accounts2u_delegates;");
	// sqles.push("delete from mem_accounts2u_multisignatures;");
	sqles.push("INSERT INTO mem_accounts2u_contacts SELECT * FROM mem_accounts2contacts;");
	sqles.push("INSERT INTO mem_accounts2u_delegates SELECT * FROM mem_accounts2delegates;");
	// sqles.push("INSERT INTO mem_accounts2u_multisignatures SELECT * FROM mem_accounts2multisignatures;");

	async.eachSeries(sqles, function (command, cb) {
		scope.dbLite.query(command, function (err, data) {
			cb(err, data);
		});
	}.bind(this), function (err) {
		setImmediate(cb, err, this);
	}.bind(this));
}

Account.prototype.removeTables = function (cb) {
	var scope = this.scope;
	var sqles = [];

	var sql = jsonSql.build({
		type: 'remove',
		table: this.table
	});
	sqles.push(sql.query);

	async.eachSeries(sqles, function (command, cb) {
		scope.dbLite.query(command, function (err, data) {
			cb(err, data);
		});
	}.bind(this), function (err) {
		setImmediate(cb, err, this);
	}.bind(this));
}

Account.prototype.objectNormalize = function (account) {
	var report = this.scope.scheme.validate(account, {
		object: true,
		properties: this.filter
	});

	if (!report) {
		throw Error(this.scope.scheme.getLastError());
	}

	return account;
}

Account.prototype.toDB = function (raw) {
	this.binary.forEach(function (field) {
		if (raw[field]) {
			raw[field] = new Buffer(raw[field], "hex");
		}
	});

	return raw;
}

Account.prototype.get = function (filter, fields, cb) {
	if (typeof(fields) == 'function') {
		cb = fields;
		fields = this.fields.map(function (field) {
			return field.alias || field.field;
		});
	}

	this.getAll(filter, fields, function (err, data) {
		cb(err, data && data.length ? data[0] : null)
	})
}

Account.prototype.getAll = function (filter, fields, cb) {
	if (typeof(fields) == 'function') {
		cb = fields;
		fields = this.fields.map(function (field) {
			return field.alias || field.field;
		});
	}

	var realFields = this.fields.filter(function (field) {
		return fields.indexOf(field.alias || field.field) != -1;
	});

	var realConv = {};
	Object.keys(this.conv).forEach(function (key) {
		if (fields.indexOf(key) != -1) {
			realConv[key] = this.conv[key];
		}
	}.bind(this));

	var limit, offset, sort;

	if (filter.limit > 0) {
		limit = filter.limit;
	}
	delete filter.limit;
	if (filter.offset > 0) {
		offset = filter.offset;
	}
	delete filter.offset;
	if (filter.sort) {
		sort = filter.sort;
	}
	delete filter.sort;

	var sql = jsonSql.build({
		type: 'select',
		table: this.table,
		limit: limit,
		offset: offset,
		sort: sort,
		alias: 'a',
		condition: filter,
		fields: realFields
	});

	this.scope.dbLite.query(sql.query, sql.values, realConv, function (err, data) {
		if (err) {
			return cb(err);
		}

		cb(null, data || []);
	}.bind(this));
}

Account.prototype.set = function (address, fields, cb) {
	var self = this;

	if (fields.publicKey !== undefined && !fields.publicKey){
		console.log("!!!!!!!!!!!!!!!!!!!!!!!", address, diff)
	}

	fields.address = address;
	var account = fields;
	var sqles = []

	var sql = jsonSql.build({
		type: 'insert',
		or: "ignore",
		table: this.table,
		values: this.toDB(account)
	});

	sqles.push(sql);

	var sql = jsonSql.build({
		type: 'update',
		table: this.table,
		modifier: this.toDB(account),
		condition: {
			address: address
		}
	});

	sqles.push(sql);

	async.eachSeries(sqles, function (sql, cb) {
		self.scope.dbLite.query(sql.query, sql.values, function (err, data) {
			cb(err, data);
		});
	}, cb);
}

Account.prototype.merge = function (address, diff, cb) {
	var update = {}, remove = {}, insert = {}, insert_object = {}, remove_object = {}, round = [];

	var self = this;

	if (diff.publicKey !== undefined && !diff.publicKey){
		console.log("!!!!!!!!!!!!!!!!!!!!!!!", address, diff)
	}

	this.editable.forEach(function (value) {
		if (diff[value]) {
			var trueValue = diff[value];
			switch (self.conv[value]) {
				case String:
					update[value] = trueValue;
					break;
				case Number:
					if (Math.abs(trueValue) === trueValue && trueValue !== 0) {
						update.$inc = update.$inc || {};
						update.$inc[value] = trueValue;
						if (value == "balance") {
							round.push({
								query: "insert into mem_round (address, amount, delegate, blockId, round) select $address, $amount, dependentId, $blockId, $round from mem_accounts2delegates where accountId = $address",
								values: {
									address: address,
									amount: trueValue,
									blockId: diff.blockId,
									round: diff.round
								}
							});
						}
					}
					else if (trueValue < 0) {
						update.$dec = update.$dec || {};
						update.$dec[value] = Math.abs(trueValue);
						if (value == "balance") {
							round.push({
								query: "insert into mem_round (address, amount, delegate, blockId, round) select $address, $amount, dependentId, $blockId, $round from mem_accounts2delegates where accountId = $address",
								values: {
									address: address,
									amount: trueValue,
									blockId: diff.blockId,
									round: diff.round
								}
							});
						}
					}
					break;
				case Array:
					if (Object.prototype.toString.call(trueValue[0]) == "[object Object]") {
						for (var i = 0; i < trueValue.length; i++) {
							var val = trueValue[i];
							if (val.action == "-") {
								delete val.action;
								remove_object[value] = remove_object[value] || [];
								remove_object[value].push(val);
							} else if (val.action == "+") {
								delete val.action;
								insert_object[value] = insert_object[value] || [];
								insert_object[value].push(val)
							} else {
								delete val.action;
								insert_object[value] = insert_object[value] || [];
								insert_object[value].push(val)
							}
						}
					} else {
						for (var i = 0; i < trueValue.length; i++) {
							var math = trueValue[i][0];
							var val = null;
							if (math == "-") {
								val = trueValue[i].slice(1);
								remove[value] = remove[value] || [];
								remove[value].push(val);
								if (value == "delegates") {
									round.push({
										query: "insert into mem_round (address, amount, delegate, blockId, round) select $address, -balance, $delegate, $blockId, $round from mem_accounts where address = $address",
										values: {
											address: address,
											delegate: val,
											blockId: diff.blockId,
											round: diff.round
										}
									});
								}
							} else if (math == "+") {
								val = trueValue[i].slice(1);
								insert[value] = insert[value] || [];
								insert[value].push(val)
								if (value == "delegates") {
									round.push({
										query: "insert into mem_round (address, amount, delegate, blockId, round) select $address, balance, $delegate, $blockId, $round from mem_accounts where address = $address",
										values: {
											address: address,
											delegate: val,
											blockId: diff.blockId,
											round: diff.round
										}
									});
								}
							} else {
								val = trueValue[i];
								insert[value] = insert[value] || [];
								insert[value].push(val)
								if (value == "delegates") {
									round.push({
										query: "insert into mem_round (address, amount, delegate, blockId, round) select $address, balance, $delegate, $blockId, $round from mem_accounts where address = $address",
										values: {
											address: address,
											delegate: val,
											blockId: diff.blockId,
											round: diff.round
										}
									});
								}
							}
						}
					}
					break;
			}
		}
	});

	var sqles = [];

	if (Object.keys(remove).length) {
		Object.keys(remove).forEach(function (el) {
			var sql = jsonSql.build({
				type: 'remove',
				table: self.table + "2" + el,
				condition: {
					dependentId: {$in: remove[el]},
					accountId: address
				}
			});
			sqles.push(sql);
		});
	}

	if (Object.keys(insert).length) {
		Object.keys(insert).forEach(function (el) {
			for (var i = 0; i < insert[el].length; i++) {
				var sql = jsonSql.build({
					type: 'insert',
					table: self.table + "2" + el,
					values: {
						accountId: address,
						dependentId: insert[el][i]
					}
				});
				sqles.push(sql);
			}
		});
	}

	if (Object.keys(remove_object).length) {
		Object.keys(remove_object).forEach(function (el) {
			remove_object[el].accountId = address;
			var sql = jsonSql.build({
				type: 'remove',
				table: self.table + "2" + el,
				condition: remove_object[el]
			});
			sqles.push(sql);
		});
	}

	if (Object.keys(insert_object).length) {
		Object.keys(insert_object).forEach(function (el) {
			insert_object[el].accountId = address;
			for (var i = 0; i < insert_object[el].length; i++) {
				var sql = jsonSql.build({
					type: 'insert',
					table: self.table + "2" + el,
					values: insert_object[el]
				});
				sqles.push(sql);
			}
		});
	}

	if (Object.keys(update).length) {
		var sql = jsonSql.build({
			type: 'update',
			table: this.table,
			modifier: update,
			condition: {
				address: address
			}
		});
		sqles.push(sql);
	}

	function done(err) {
		if (cb.length != 2) {
			return cb(err);
		} else {
			if (err) {
				return cb(err);
			}
			self.get({address: address}, cb);
		}
	}

	async.series([
		function (cb) {
			if (sqles.length > 1) {
				self.scope.dbLite.query('BEGIN TRANSACTION;');
			}

			async.eachSeries(sqles, function (sql, cb) {
				self.scope.dbLite.query(sql.query, sql.values, function (err, data) {
					cb(err, data);
				});
			}, function (err) {
				if (err) {
					if (sqles.length > 1) {
						self.scope.dbLite.query('ROLLBACK;', function (rollbackErr) {
							cb(rollbackErr || err);
						});
					} else {
						cb(err);
					}
					return;
				}
				if (sqles.length > 1) {
					self.scope.dbLite.query('COMMIT;', cb);
				} else {
					cb();
				}
			});
		},
		function (cb) {
			if (round.length > 1) {
				self.scope.dbLite.query('BEGIN TRANSACTION;');
			}

			async.eachSeries(round, function (sql, cb) {
				self.scope.dbLite.query(sql.query, sql.values, function (err, data) {
					cb(err, data);
				});
			}, function (err) {
				if (err) {
					if (round.length > 1) {
						self.scope.dbLite.query('ROLLBACK;', function (rollbackErr) {
							cb(rollbackErr || err);
						});
					} else {
						cb(err);
					}
					return;
				}
				if (round.length > 1) {
					self.scope.dbLite.query('COMMIT;', cb);
				} else {
					cb();
				}
			});
		}
	], done);
}

Account.prototype.remove = function (address, cb) {
	var sql = jsonSql.build({
		type: 'remove',
		table: this.table,
		condition: {
			address: address
		}
	});
	this.scope.dbLite.query(sql.query, sql.values, function (err, data) {
		cb(err, address);
	});
}

// Export
module.exports = Account;
