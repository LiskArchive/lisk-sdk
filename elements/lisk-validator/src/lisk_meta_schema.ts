/*
 * Copyright © 2020 Lisk Foundation
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

export const liskMetaSchema = {
	$schema: 'http://json-schema.org/draft-07/schema#',
	$id: 'http://lisk.com/lisk-schema/schema#',
	title: 'Lisk Schema',
	type: 'object',
	properties: {
		$schema: {
			type: 'string',
			const: 'http://lisk.com/lisk-schema/schema#',
			format: 'uri',
		},
		$id: {
			type: 'string',
			format: 'uri-reference',
		},
		title: {
			type: 'string',
		},
		type: {
			type: 'string',
			const: 'object',
		},
		properties: {
			type: 'object',
			propertyNames: {
				type: 'string',
				format: 'camelCase',
			},
			additionalProperties: {
				anyOf: [
					{
						$ref: '#/definitions/schema',
					},
					{
						type: 'object',
						properties: {
							type: {
								type: 'string',
								enum: ['array', 'object'],
							},
						},
					},
				],
			},
		},
		required: {
			type: 'array',
			items: {
				type: 'string',
			},
			uniqueItems: true,
		},
	},
	required: ['$id', '$schema', 'type', 'properties'],
	additionalProperties: false,
	definitions: {
		schema: {
			allOf: [{ $ref: 'http://json-schema.org/draft-07/schema#' }],
		},
	},
};
