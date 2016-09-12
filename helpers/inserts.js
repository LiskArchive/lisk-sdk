'use strict';

var pgp = require('pg-promise');

function Inserts (record, values, concat) {
	if (!(this instanceof Inserts)) {
		return new Inserts(record, values, concat);
	}

	var self = this;

	if (!record || !record.table || !record.values) {
		throw 'Inserts: Invalid record argument';
	}

	if (!values) {
		throw 'Inserts: Invalid values argument';
	}

	this.namedTemplate = function () {
		return record.fields.map(function (field, index) {
			return '${' + field + '}';
		}).join(',');
	};

	this._template = this.namedTemplate();

	this.template = function () {
		var values;
		var fields = record.fields.map(pgp.as.name).join(',');
		if (concat) {
			values = '$1';
		} else {
			values = '(' + this.namedTemplate() + ')';
		}
		return pgp.as.format('INSERT INTO $1~($2^) VALUES $3^', [record.table, fields, values]);
	};

	this._rawDBType = true;

	this.formatDBType = function () {
		return values.map(function (v) {
			return '(' + pgp.as.format(self._template, v) + ')';
		}).join(',');
	};
}

module.exports = Inserts;
