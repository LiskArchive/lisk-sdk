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

const { NonSupportedFilterTypeError } = require('../errors');
const filterTypes = require('./filter_types');
const inputSerializers = require('./inputSerialzers');

function filterGenerator(
	filterType,
	alias,
	fieldName,
	valueSerializer,
	rawCondition
) {
	const filters = {};
	const serializer = valueSerializer || inputSerializers.default;
	const value = serializer.call(null, 'select', alias, fieldName);

	switch (filterType) {
		case filterTypes.BOOLEAN:
			filters[alias] = `"${fieldName}" = ${value}`;
			filters[`${alias}_eql`] = `"${fieldName}" = ${value}`;
			filters[`${alias}_ne`] = `"${fieldName}" <> ${value}`;
			break;

		case filterTypes.TEXT:
			filters[alias] = `"${fieldName}" = ${value}`;
			filters[`${alias}_eql`] = `"${fieldName}" = ${value}`;
			filters[`${alias}_ne`] = `"${fieldName}" <> ${value}`;

			filters[`${alias}_in`] = `"${fieldName}" IN ($\{${alias}_in:csv})`;
			filters[`${alias}_like`] = `"${fieldName}" LIKE ($\{${alias}_like})`;
			break;

		case filterTypes.NUMBER:
			filters[alias] = `"${fieldName}" = ${value}`;
			filters[`${alias}_eql`] = `"${fieldName}" = ${value}`;
			filters[`${alias}_ne`] = `"${fieldName}" <> ${value}`;

			filters[`${alias}_gt`] = `"${fieldName}" > ${value}`;
			filters[`${alias}_gte`] = `"${fieldName}" >= ${value}`;
			filters[`${alias}_lt`] = `"${fieldName}" < ${value}`;
			filters[`${alias}_lte`] = `"${fieldName}" <= ${value}`;
			filters[`${alias}_in`] = `"${fieldName}" IN ($\{${alias}_in:csv})`;
			break;

		case filterTypes.CUSTOM:
			if (rawCondition) {
				filters[alias] = rawCondition;
			} else {
				filters[alias] = `"${fieldName}" = ${value}`;
			}
			break;

		default:
			throw new NonSupportedFilterTypeError(filterType);
	}

	return filters;
}

module.exports = {
	filterGenerator,
};
