/*
 * LiskHQ/lisk-commander
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
 *
 */

import { GeneratorConstructor, GeneratorOptions } from 'yeoman-generator';

export interface BaseGeneratorOptions extends GeneratorOptions {
	template: string;
	version: string;
	projectPath?: string;
	registry?: string;
}

export interface LiskTemplate {
	generators: {
		init: GeneratorConstructor;
		initPlugin: GeneratorConstructor;
		module: GeneratorConstructor;
		command: GeneratorConstructor;
		plugin: GeneratorConstructor;
	};
}

export type PromiseResolvedType<T> = T extends Promise<infer R> ? R : never;

export interface Schema {
	readonly $id: string;
	readonly type: string;
	readonly properties: Record<string, unknown>;
}

export type RecursivePartial<T> = {
	[P in keyof T]?: RecursivePartial<T[P]>;
};
