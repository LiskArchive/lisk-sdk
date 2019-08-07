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

const { NonSupportedFilterTypeError } = require('../errors');
const filterTypes = require('./filter_types');
const inputSerializers = require('./input_serializers');

function filterGenerator(
	filterType,
	alias,
	fieldName,
	valueSerializer,
	condition,
) {
	const filters = {};
	const serializer = valueSerializer || inputSerializers.defaultInput;
	const getValue = filterAlias =>
		serializer.call(null, null, 'select', filterAlias, fieldName);

	// Allow to use table name as prefix (table.field => "table"."field")
	const parsedFieldName = fieldName
		.split('.')
		.map(value => `"${value}"`)
		.join('.');

	switch (filterType) {
		case filterTypes.BOOLEAN:
			filters[alias] = `${parsedFieldName} = ${getValue(alias)}`;
			filters[`${alias}_eql`] = `${parsedFieldName} = ${getValue(
				`${alias}_eql`,
			)}`;
			filters[`${alias}_ne`] = `${parsedFieldName} <> ${getValue(
				`${alias}_ne`,
			)}`;
			break;

		case filterTypes.TEXT:
			filters[alias] = `${parsedFieldName} = ${getValue(alias)}`;
			filters[`${alias}_eql`] = `${parsedFieldName} = ${getValue(
				`${alias}_eql`,
			)}`;
			filters[`${alias}_ne`] = `${parsedFieldName} <> ${getValue(
				`${alias}_ne`,
			)}`;

			filters[`${alias}_in`] = `${parsedFieldName} IN ($\{${alias}_in:csv})`;
			filters[`${alias}_like`] = `${parsedFieldName} LIKE ($\{${alias}_like})`;
			break;

		case filterTypes.BINARY:
			filters[alias] = `${parsedFieldName} = ${getValue(alias)}`;
			filters[`${alias}_eql`] = `${parsedFieldName} = ${getValue(
				`${alias}_eql`,
			)}`;
			filters[`${alias}_ne`] = `${parsedFieldName} <> ${getValue(
				`${alias}_ne`,
			)}`;

			filters[
				`${alias}_in`
			] = `ENCODE(${parsedFieldName}, 'hex') IN ($\{${alias}_in:csv})`;
			filters[`${alias}_like`] = `${parsedFieldName} LIKE ($\{${alias}_like})`;
			break;

		case filterTypes.NUMBER:
			filters[alias] = `${parsedFieldName} = ${getValue(alias)}`;
			filters[`${alias}_eql`] = `${parsedFieldName} = ${getValue(
				`${alias}_eql`,
			)}`;
			filters[`${alias}_ne`] = `${parsedFieldName} <> ${getValue(
				`${alias}_ne`,
			)}`;

			filters[`${alias}_gt`] = `${parsedFieldName} > ${getValue(
				`${alias}_gt`,
			)}`;
			filters[`${alias}_gte`] = `${parsedFieldName} >= ${getValue(
				`${alias}_gte`,
			)}`;
			filters[`${alias}_lt`] = `${parsedFieldName} < ${getValue(
				`${alias}_lt`,
			)}`;
			filters[`${alias}_lte`] = `${parsedFieldName} <= ${getValue(
				`${alias}_lte`,
			)}`;
			filters[`${alias}_in`] = `${parsedFieldName} IN ($\{${alias}_in:csv})`;
			break;

		case filterTypes.CUSTOM:
			if (condition) {
				filters[alias] = condition;
			} else {
				filters[alias] = `${parsedFieldName} = ${serializer.call(
					null,
					null,
					'select',
					alias,
					parsedFieldName,
				)}`;
			}
			break;

		default:
			throw new NonSupportedFilterTypeError(
				`"${filterType}" not supported filter type. Supported types are: ${Object.keys(
					filterTypes,
				)}.`,
			);
	}

	return filters;
}

module.exports = {
	filterGenerator,
};
