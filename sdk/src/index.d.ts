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

type AnyClass = { new (): any };
type TransactionClass = AnyClass;
type ModuleClass = AnyClass;

declare class Application {
	readonly logger: any;
	readonly config: any;

	constructor(genesisBlock: any, config?: any);
	run(): Promise<void>;
	registerTransaction(
		transactionClass: TransactionClass,
		matcher?: { matcher: () => boolean }
	): void;
	registerModule(moduleClass: ModuleClass, options?: any, alias?: string): void;
	registerMigrations(namespace: string, migrations: Array<string>): void;
	getTransaction(transactionType: number): AnyClass;
	getTransactions(): { [key: number]: AnyClass };
	getModule(alias: string): AnyClass;
	getModules(): { [key: string]: AnyClass };
	getMigrations(): { [key: string]: AnyClass };
	shutdown(errorCode?: number, message?: string): Promise<void>;
}

declare class Configurator {
	constructor();
	getConfig(overrideValues: any, options: { failOnInvalidArg: boolean }): void;
	registerModule(moduleClass: AnyClass): void;
	loadConfigFile(configFilePath: string, destinationPath: string): void;
	loadConfig(data: string, destinationPath: string): void;
	extractMetaInformation(): void;
	helpBanner(): void;
	registerSchema(schema: any, key: string): void;
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
	configDevnet,
	genesisBlockDevnet,
};
