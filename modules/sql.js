var async = require("async");
var jsonSql = require("json-sql")();
    jsonSql.setDialect("postgresql");
var extend = require("extend");
var sandboxHelper = require("../helpers/sandbox.js");

// Private fields
var modules, library, self, private = {}, shared = {};

private.loaded = false;
private.DOUBLE_DOUBLE_QUOTES = /""/g;
private.SINGLE_QUOTES = /'/g;
private.SINGLE_QUOTES_DOUBLED = "''";

// Constructor
function Sql(cb, scope) {
	library = scope;
	self = this;
	self.__private = private;

	setImmediate(cb, null, self);
}

private.escape = function (what) {
	switch (typeof what) {
		case 'string':
			return "'" + what.replace(
					private.SINGLE_QUOTES, private.SINGLE_QUOTES_DOUBLED
				) + "'";
		case 'object':
			if (what == null) {
				return 'null';
			} else if (Buffer.isBuffer(what)) {
				return "X'" + what.toString('hex') + "'";
			} else {
				return ("'" + JSON.stringify(what).replace(
					private.SINGLE_QUOTES, private.SINGLE_QUOTES_DOUBLED
				) + "'");
			}
		case 'boolean':
			return what ? '1' : '0'; // 1 => true, 0 => false
		case 'number':
			if (isFinite(what)) return '' + what;
	}
	throw new Error('Unsupported data', typeof what);
}

private.pass = function (obj, dappid) {
	for (var property in obj) {
		if (typeof obj[property] == "object") {
			private.pass(obj[property], dappid);
		}
		if (property == "table") {
			obj[property] = "dapp_" + dappid + "_" + obj[property];
		}
		if (property == "join" && obj[property].length === undefined) {
			for (var table in obj[property]) {
				var tmp = obj[property][table];
				delete obj[property][table];
				obj[property]["dapp_" + dappid + "_" + table] = tmp;
			}
		}
		if (property == "on" && !obj.alias) {
			for (var firstTable in obj[property]) {
				var secondTable = obj[property][firstTable];
				delete obj[property][firstTable];

				var firstTableRaw = firstTable.split(".");
				firstTable = "dapp_" + dappid + "_" + firstTableRaw[0];

				var secondTableRaw = secondTable.split(".");
				secondTable = "dapp_" + dappid + "_" + secondTableRaw[0];

				obj[property][firstTable] = secondTable;
			}
		}
	}
}

// Private methods
private.query = function (action, config, cb) {
	var sql = null;

	function done (err, data) {
		if (err) {
			err = err;
		}

		cb(err, data);
	}

	if (action != "batch") {
		private.pass(config, config.dappid);

		var defaultConfig = {
			type: action
		};

		try {
			sql = jsonSql.build(extend({}, config, defaultConfig));
		} catch (e) {
			return done(e);
		}

		// console.log(sql.query, sql.values);

		library.db.query(sql.query, sql.values).then(function (rows) {
			return done(null, rows);
		}).catch(function (err) {
			library.logger.error(err.toString());
			return done("Sql#query error");
		});
	} else {
		var batchPack = [];
		async.until(
			function () {
				batchPack = config.values.splice(0, 10);
				return batchPack.length == 0
			}, function (cb) {
				var fields = Object.keys(config.fields).map(function (field) {
					return private.escape(config.fields[field]);
				});
				sql = "INSERT INTO " + "dapp_" + config.dappid + "_" + config.table + " (" + fields.join(",") + ") ";
				var rows = [];
				batchPack.forEach(function (value, rowIndex) {
					var currentRow = batchPack[rowIndex];
					var fields = [];
					for (var i = 0; i < currentRow.length; i++) {
						fields.push(private.escape(currentRow[i]));
					}
					rows.push("SELECT " + fields.join(","));
				});
				sql = sql + " " + rows.join(" UNION ");
				library.db.none(sql).then(function () {
					return cb();
				}).catch(function (err) {
					library.logger.error(err.toString());
					return cb("Sql#query error");
				});
			}, done);
	}
}

// Public methods
Sql.prototype.createTables = function (dappid, config, cb) {
	if (!config) {
		return cb("Invalid table format");
	}

	var sqles = [];
	for (var i = 0; i < config.length; i++) {
		config[i].table = "dapp_" + dappid + "_" + config[i].table;
		if (config[i].type == "table") {
			config[i].type = "create";
			if (config[i].foreignKeys) {
				for (var n = 0; n < config[i].foreignKeys.length; n++) {
					config[i].foreignKeys[n].table = "dapp_" + dappid + "_" + config[i].foreignKeys[n].table;
				}
			}
		} else if (config[i].type == "index") {
			config[i].type = "index";
		} else {
			return setImmediate(cb, "Unknown table type: " + config[i].type);
		}

		var sql = jsonSql.build(config[i]);
		sqles.push(sql.query);
	}

	async.eachSeries(sqles, function (command, cb) {
		library.db.none(command).then(function () {
			return cb();
		}).then(function (err) {
			return cb(err);
		});
	}, function (err) {
		if (err) {
			setImmediate(cb, "Sql#createTables error", self);
		} else {
			setImmediate(cb);
		}
	});
}

Sql.prototype.dropTables = function (dappid, config, cb) {
	var tables = [];
	for (var i = 0; i < config.length; i++) {
		tables.push({name: config[i].table.replace(/[^\w_]/gi, ''), type: config[i].type});
	}

	async.eachSeries(tables, function (table, cb) {
		if (table.type == "create") {
			library.db.none("DROP TABLE IF EXISTS " + table.name + " CASCADE").then(function () {
				setImmediate(cb, null);
			}).catch(function (err) {
				library.logger.error(err.toString());
				setImmediate(cb, "Sql#dropTables error");
			});
		} else if (table.type == "index") {
			library.db.none("DROP INDEX IF EXISTS " + table.name).then(function () {
				setImmediate(cb, null);
			}).catch(function (err) {
				library.logger.error(err.toString());
				setImmediate(cb, "Sql#dropTables error");
			});
		} else {
			setImmediate(cb);
		}
	}, cb);
}

Sql.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
}

// Events
Sql.prototype.onBind = function (scope) {
	modules = scope;
}

Sql.prototype.onBlockchainReady = function () {
	private.loaded = true;
}

// Shared
shared.select = function (req, cb) {
	var config = extend({}, req.body, {dappid: req.dappid});
	private.query.call(this, "select", config, cb);
}

shared.batch = function (req, cb) {
	var config = extend({}, req.body, {dappid: req.dappid});
	private.query.call(this, "batch", config, cb);
}

shared.insert = function (req, cb) {
	var config = extend({}, req.body, {dappid: req.dappid});
	private.query.call(this, "insert", config, cb);
}

shared.update = function (req, cb) {
	var config = extend({}, req.body, {dappid: req.dappid});
	private.query.call(this, "update", config, cb);
}

shared.remove = function (req, cb) {
	var config = extend({}, req.body, {dappid: req.dappid});
	private.query.call(this, "remove", config, cb);
}

module.exports = Sql;
