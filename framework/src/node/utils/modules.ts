/*
 * Copyright © 2021 Lisk Foundation
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

import { blockHeaderSchema, blockSchema, transactionSchema } from '@liskhq/lisk-chain';
import { BaseModule } from '../../modules';
import { RegisteredModule, RegisteredSchema } from '../../types';

export const getSchema = (modules: BaseModule[]): RegisteredSchema => {
	const commandSchemas: RegisteredSchema['commands'] = [];
	for (const customModule of modules) {
		for (const customCommand of customModule.commands) {
			commandSchemas.push({
				moduleID: customModule.id,
				moduleName: customModule.name,
				commandID: customCommand.id,
				commandName: customCommand.name,
				schema: customCommand.schema,
			});
		}
	}
	return {
		block: blockSchema,
		blockHeader: blockHeaderSchema,
		transaction: transactionSchema,
		commands: commandSchemas,
	};
};

export const getRegisteredModules = (modules: BaseModule[]): RegisteredModule[] =>
	modules.reduce<RegisteredModule[]>((prev, mod) => {
		prev.push({
			id: mod.id,
			name: mod.name,
			endpoints: Object.keys(mod.endpoint)
				.filter(key => typeof mod.endpoint[key] === 'function' && !key.startsWith('_'))
				.map(key => `${mod.name}_${key}`),
			events: mod.events.map(key => `${mod.name}_${key}`),
			commands: mod.commands.map(c => ({ id: c.id, name: c.name })),
		});
		return prev;
	}, []);

const reservedEndpointName = ['constructor', 'init'];

export const isReservedEndpointFunction = (key: string): boolean =>
	key.startsWith('_') || reservedEndpointName.includes(key);
