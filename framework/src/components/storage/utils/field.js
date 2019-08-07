/*
 * Copyright © 2019 Lisk Foundation
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

const assert = require('assert');
const { filterGenerator } = require('./filters');
const inputSerializers = require('./input_serializers');

class Field {
	/**
	 *
	 * @param {String} name
	 * @param {String} type
	 * @param {Object} [options={}]
	 * @param {string} [options.fieldName] - Real name of the field
	 * @param {string} [options.filter] - Filter type
	 * @param {string} [options.filterCondition] - Filter condition
	 * @param {Function} [inputSerializer] - Serializer function
	 */
	constructor(name, type, options = {}, inputSerializer) {
		assert(name, 'Name is required to initialize field.');
		assert(type, 'Type is required to initialize field.');

		this.name = name;
		this.type = type;
		this.fieldName = options.fieldName || this.name;
		this.filterType = options.filter;
		this.inputSerializer = inputSerializer || inputSerializers.defaultInput;
		this.filterCondition = options.filterCondition;

		if (this.filterType) {
			this.filters = this.generateFilters(
				this.filterType,
				this.name,
				this.fieldName,
				this.inputSerializer,
				this.filterCondition,
			);
		}
	}

	getFilters() {
		return this.filters;
	}

	serializeValue(value, mode = 'update') {
		return this.inputSerializer.call(
			this,
			value,
			mode,
			this.name,
			this.fieldName,
		);
	}

	generateFilters() {
		return filterGenerator(
			this.filterType,
			this.name,
			this.fieldName,
			this.inputSerializer,
			this.filterCondition,
		);
	}
}

module.exports = Field;
