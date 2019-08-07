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

const debug = require('debug')('lisk:validator:arg');
const yargs = require('yargs');
const _ = require('lodash');
const formatters = require('../formatters');
const metaSchema = require('./meta_schema');

const compile = (schema, parentSchema) => {
	debug('compile: schema: %j', schema);
	debug('compile: parent schema: %j', parentSchema);

	const argVariable =
		typeof schema === 'string'
			? {
					names: schema.split(',') || [],
					formatter: null,
			  }
			: {
					names: schema.name.split(',') || [],
					formatter: formatters[schema.formatter] || null,
			  };

	return (data, dataPath, object, key) => {
		let argValue;
		const commandLineArguments = yargs.argv;

		argVariable.names.forEach(argName => {
			if (argValue === undefined) {
				// Remove "-" or "--" from command line argument names
				argValue = commandLineArguments[_.camelCase(argName)];
			}
		});

		if (argValue !== undefined) {
			object[key] = argVariable.formatter
				? argVariable.formatter(argValue)
				: argValue;
		}
	};
};

const envKeyword = {
	compile,
	errors: false,
	modifying: true,
	valid: true,
	metaSchema,
};

module.exports = envKeyword;
