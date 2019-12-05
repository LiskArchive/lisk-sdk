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

/* tslint:disable */
import * as BigNum from '@liskhq/bignum';
import * as cryptography from '@liskhq/lisk-cryptography';
import * as transactions from '@liskhq/lisk-transactions';
import * as validator from '@liskhq/lisk-validator';

declare class Application {
	readonly logger: any;
	readonly config: any;

	constructor(genesisBlock: any, config?: any);
	run(): Promise<void>;
	registerTransaction(
		transactionClass: any,
		matcher?: { matcher: (context: any) => boolean }
	): void;
	registerModule(moduleClass: any, options?: any, alias?: string): void;
	registerMigrations(namespace: string, migrations: Array<string>): void;
	getTransaction(transactionType: number): any;
	getTransactions(): { [key: number]: any };
	getModule(alias: string): any;
	getModules(): { [key: string]: any };
	getMigrations(): { [key: string]: any };
	shutdown(errorCode?: number, message?: string): Promise<void>;
}

declare class Configurator {
	constructor();
	getConfig(overrideValues?: any, options?: { failOnInvalidArg: boolean }): any;
	registerModule(moduleClass: any): void;
	loadConfigFile(configFilePath: string, destinationPath?: string): void;
	loadConfig(data: any, destinationPath?: string): void;
	extractMetaInformation(): void;
	helpBanner(): void;
	registerSchema(schema: any, key?: string): void;
}

declare const version: number;
declare const systemDirs: any;
declare const configurator: Configurator;
declare const configDevnet: any;
declare const genesisBlockDevnet: any;

export {
	Application,
	version,
	systemDirs,
	configurator,
	BigNum,
	cryptography,
	transactions,
	validator,
	configDevnet,
	genesisBlockDevnet,
};
