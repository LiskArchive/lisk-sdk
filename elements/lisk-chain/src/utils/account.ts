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

import { objects } from '@liskhq/lisk-utils';
import { Schema } from '@liskhq/lisk-codec';
import { AccountSchema } from '../types';
import { baseAccountSchema } from '../schema';

export const getAccountSchemaAndDefault = (accountSchemas: {
	[moduleName: string]: AccountSchema;
}): { schema: Schema; defaultAccount: Record<string, unknown> } => {
	const defaultAccount: Record<string, unknown> = {};
	const accountSchema: Schema = objects.cloneDeep(baseAccountSchema);
	for (const [name, schema] of Object.entries(accountSchemas)) {
		const { default: defaultValue, ...schemaWithoutDefault } = schema;
		accountSchema.properties[name] = schemaWithoutDefault;
		(accountSchema.required as string[]).push(name);
		defaultAccount[name] = defaultValue;
	}
	return {
		schema: accountSchema,
		defaultAccount,
	};
};
