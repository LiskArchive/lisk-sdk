var async = require("async");
var pgp = require("pg-promise");
var jsonSql = require("json-sql")();
    jsonSql.setDialect("postgresql");
var constants = require("../helpers/constants.js");
var slots = require("../helpers/slots.js");
var genesisBlock = null;

// Private fields
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
			type: "SmallInt",
			filter: {
				type: "boolean"
			},
			conv: Boolean,
			default: 0
		},
		{
			name: "u_isDelegate",
			type: "SmallInt",
			filter: {
				type: "boolean"
			},
			conv: Boolean,
			default: 0
		},
		{
			name: "secondSignature",
			type: "SmallInt",
			filter: {
				type: "boolean"
			},
			conv: Boolean,
			default: 0
		},
		{
			name: "u_secondSignature",
			type: "SmallInt",
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
				maxLength: 20,
				minLength: 1
			},
			conv: String,
			constante: true
		},
		{
			name: "address",
			type: "String",
			length: 22,
			not_null: true,
			unique: true,
			primary_key: true,
			filter: {
				required: true,
				type: "string",
				minLength: 1,
				maxLength: 22
			},
			conv: String,
			constante: true
		},
		{
			name: "publicKey",
			type: "Binary",
			filter: {
				type: "string",
				format: "publicKey"
			},
			conv: String,
			constante: true,
			expression: "ENCODE(\"publicKey\", 'hex')"
		},
		{
			name: "secondPublicKey",
			type: "Binary",
			filter: {
				type: "string",
				format: "publicKey"
			},
			conv: String,
			constante: true,
			expression: "ENCODE(\"secondPublicKey\", 'hex')"
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
			expression: "(\"balance\")::bigint",
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
			expression: "(\"u_balance\")::bigint",
			default: 0
		},
		{
			name: "vote",
			type: "BigInt",
			filter: {
				type: "integer"
			},
			conv: Number,
			expression: "(\"vote\")::bigint",
			default: 0
		},
		{
			name: "rate",
			type: "BigInt",
			filter: {
				type: "integer"
			},
			conv: Number,
			expression: "(\"rate\")::bigint",
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
			expression: "(SELECT STRING_AGG(\"dependentId\", ',') FROM " + this.table + "2delegates WHERE \"accountId\" = a.\"address\")"
		},
		{
			name: "u_delegates",
			type: "Text",
			filter: {
				type: "array",
				uniqueItems: true
			},
			conv: Array,
			expression: "(SELECT STRING_AGG(\"dependentId\", ',') FROM " + this.table + "2u_delegates WHERE \"accountId\" = a.\"address\")"
		},
		{
			name: "multisignatures",
			type: "Text",
			filter: {
				type: "array",
				uniqueItems: true
			},
			conv: Array,
			expression: "(SELECT STRING_AGG(\"dependentId\", ',') FROM " + this.table + "2multisignatures WHERE \"accountId\" = a.\"address\")"
		},
		{
			name: "u_multisignatures",
			type: "Text",
			filter: {
				type: "array",
				uniqueItems: true
			},
			conv: Array,
			expression: "(SELECT STRING_AGG(\"dependentId\", ',') FROM " + this.table + "2u_multisignatures WHERE \"accountId\" = a.\"address\")"
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
			expression: "(\"multimin\")::bigint",
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
			expression: "(\"u_multimin\")::bigint",
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
			expression: "(\"multilifetime\")::bigint",
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
			expression: "(\"u_multilifetime\")::bigint",
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
			type: "SmallInt",
			filter: {
				type: "boolean"
			},
			conv: Boolean,
			default: 0
		},
		{
			name: "u_nameexist",
			type: "SmallInt",
			filter: {
				type: "boolean"
			},
			conv: Boolean,
			default: 0
		},
		{
			name: "producedblocks",
			type: "Number",
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
			type: "Number",
			filter: {
				type: "integer",
				minimum: -1,
				maximum: 1
			},
			conv: Number,
			default: 0
		},
		{
			name: "fees",
			type: "BigInt",
			filter: {
				type: "integer"
			},
			conv: Number,
			expression: "(\"fees\")::bigint",
			default: 0
		},
		{
			name: "rewards",
			type: "BigInt",
			filter: {
				type: "integer"
			},
			conv: Number,
			expression: "(\"rewards\")::bigint",
			default: 0
		}
	];

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
				"length": 22
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
				length: 22,
				not_null: true
			}, {
				name: "dependentId",
				type: "String",
				length: 64,
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
				length: 22,
				not_null: true
			}, {
				name: "dependentId",
				type: "String",
				length: 64,
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
				length: 22,
				not_null: true
			}, {
				name: "dependentId",
				type: "String",
				length: 64,
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
				length: 22,
				not_null: true
			}, {
				name: "dependentId",
				type: "String",
				length: 64,
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

	sqles.push("DELETE FROM mem_accounts2u_delegates;");
	// sqles.push("DELETE FROM mem_accounts2u_multisignatures;");
	sqles.push("INSERT INTO mem_accounts2u_delegates SELECT * FROM mem_accounts2delegates;");
	// sqles.push("INSERT INTO mem_accounts2u_multisignatures SELECT * FROM mem_accounts2multisignatures;");

	var i, concatenated = "";

	for (i = 0; i < sqles.length; i++) {
		concatenated += sqles[i];
	}

	this.scope.db.query(concatenated).then(function () {
		return cb();
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Account#createTables error");
	});
}

Account.prototype.removeTables = function (cb) {
	var sqles = [], sql;

	[this.table,
	"mem_round",
	"mem_accounts2delegates",
	"mem_accounts2u_delegates",
	"mem_accounts2multisignatures",
	"mem_accounts2u_multisignatures"].forEach(function (table) {
		sql = jsonSql.build({
			type: "remove",
			table: table
		});
		sqles.push(sql.query);
	});

	var i, concatenated = "";

	for (i = 0; i < sqles.length; i++) {
		concatenated += sqles[i];
	}

	this.scope.db.query(concatenated).then(function () {
		return cb();
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Account#removeTables error");
	});
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

	this.scope.db.query(sql.query, sql.values).then(function (rows) {
		return cb(null, rows);
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Account#getAll error");
	});
}

Account.prototype.set = function (address, fields, cb) {
	if (fields.publicKey !== undefined && !fields.publicKey) {
		console.log("!!!!!!!!!!!!!!!!!!!!!!!", address, diff);
	}

	fields.address = address;
	var account = fields;
	var sqles = []

	var sql = jsonSql.build({
		type: 'insertornothing',
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

	var queries = sqles.map(function (sql) {
		return pgp.as.format(sql.query, sql.values);
	}).join('');

	this.scope.db.none(queries).then(function () {
		return cb();
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Account#set error");
	});
}

Account.prototype.merge = function (address, diff, cb) {
	var update = {}, remove = {}, insert = {}, insert_object = {}, remove_object = {}, round = [];

	var self = this;

	if (diff.publicKey !== undefined && !diff.publicKey) {
		console.log("!!!!!!!!!!!!!!!!!!!!!!!", address, diff);
	}

	this.editable.forEach(function (value) {
		if (diff[value] !== undefined) {
			var trueValue = diff[value];
			switch (self.conv[value]) {
				case String:
					update[value] = trueValue;
					break;
				case Number:
					if (isNaN(trueValue) || trueValue === Infinity) {
						console.log(diff);
						return cb("Encountered unsane number: " + trueValue);
					}
					else if (Math.abs(trueValue) === trueValue && trueValue !== 0) {
						update.$inc = update.$inc || {};
						update.$inc[value] = Math.floor(trueValue);
						if (value == "balance") {
							round.push({
								query: "INSERT INTO mem_round (\"address\", \"amount\", \"delegate\", \"blockId\", \"round\") SELECT ${address}, (${amount})::bigint, \"dependentId\", ${blockId}, ${round} FROM mem_accounts2delegates WHERE \"accountId\" = ${address};",
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
						update.$dec[value] = Math.floor(Math.abs(trueValue));
						if (value == "balance") {
							round.push({
								query: "INSERT INTO mem_round (\"address\", \"amount\", \"delegate\", \"blockId\", \"round\") SELECT ${address}, (${amount})::bigint, \"dependentId\", ${blockId}, ${round} FROM mem_accounts2delegates WHERE \"accountId\" = ${address};",
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
										query: "INSERT INTO mem_round (\"address\", \"amount\", \"delegate\", \"blockId\", \"round\") SELECT ${address}, (-balance)::bigint, ${delegate}, ${blockId}, ${round} FROM mem_accounts WHERE address = ${address};",
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
										query: "INSERT INTO mem_round (\"address\", \"amount\", \"delegate\", \"blockId\", \"round\") SELECT ${address}, (balance)::bigint, ${delegate}, ${blockId}, ${round} FROM mem_accounts WHERE address = ${address};",
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
										query: "INSERT INTO mem_round (\"address\", \"amount\", \"delegate\", \"blockId\", \"round\") SELECT ${address}, (balance)::bigint, ${delegate}, ${blockId}, ${round} FROM mem_accounts WHERE address = ${address};",
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

	function done (err) {
		if (cb.length != 2) {
			return cb(err);
		} else {
			if (err) {
				return cb(err);
			}
			self.get({ address: address }, cb);
		}
	}

	var queries = sqles.concat(round).map(function (sql) {
		return pgp.as.format(sql.query, sql.values);
	}).join('');

	if (!cb) {
		return queries;
	}

	if (queries.length == 0) {
		return done();
	}

	self.scope.db.none(queries).then(function () {
		return done();
	}).catch(function (err) {
		library.logger.error(err.toString());
		return done("Account#merge error");
	});
}

Account.prototype.remove = function (address, cb) {
	var sql = jsonSql.build({
		type: 'remove',
		table: this.table,
		condition: {
			address: address
		}
	});
	this.scope.db.none(sql.query, sql.values).then(function () {
		cb(null, address);
	}).catch(function (err) {
		library.logger.error(err.toString());
		cb("Account#remove error");
	});
}

// Export
module.exports = Account;
