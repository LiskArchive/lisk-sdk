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

var pgp = require('pg-promise');

/**
 * Creates and returns an insert instance
 * @memberof module:helpers
 * @requires pg-promise
 * @class
 * @param {Object} record
 * @param {Object} values
 * @param {boolean} [concat]
 * @return {function} True if ip is in the list, false otherwise.
 * @throws {string} Error description
 */

function Inserts (record, values, concat) {
	if (!(this instanceof Inserts)) {
		return new Inserts(record, values, concat);
	}

	var self = this;

	if (!record || !record.table || !record.fields) {
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
	/**
	 * Creates pg insert sentence.
	 * @method
	 * @return {string} Sql sentence
	 */
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
