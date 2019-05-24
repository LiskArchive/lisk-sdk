/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import fs from 'fs';
import { NETWORK } from '../constants';
import { exec, ExecResult } from '../worker-process';
import { getLiskConfig, LiskConfig } from './config';
import { describeApplication, PM2ProcessInstance } from './pm2';

const DATABASE_START_SUCCESS = '[+] Postgresql started successfully.';
const DATABASE_START_FAILURE = '[-] Failed to start Postgresql.';
const DATABASE_STOP_SUCCESS = '[+] Postgresql stopped successfully.';
const DATABASE_STOP_FAILURE = '[-] Postgresql failed to stop.';
const DATABASE_USER_SUCCESS = '[+] Postgresql user created successfully.';
const DATABASE_USER_FAILURE = '[-] Failed to create Postgresql user.';
const DATABASE_CREATE_SUCCESS = '[+] Postgresql database created successfully.';
const DATABASE_CREATE_FAILURE = '[-] Failed to create Postgresql database.';
const DATABASE_STATUS = '[+] Postgresql is not running.';
const RESTORE_SNAPSHOT_SUCCESS = '[+] Blockchain restored successfully.';
const RESTORE_SNAPSHOT_FAILURE = '[-] Failed to restore blockchain.';

const DB_DATA = 'pgsql/data';
const DB_LOG_FILE = 'logs/pgsql.log';
const PG_BIN = './pgsql/bin';
const PG_CTL = `${PG_BIN}/pg_ctl`;

const isDbInitialized = (installDir: string): boolean =>
	fs.existsSync(`${installDir}/${DB_DATA}`);

const isDbRunning = async (
	installDir: string,
	port: string,
): Promise<boolean> => {
	const { stderr }: ExecResult = await exec(
		`${PG_CTL} --pgdata ${DB_DATA} --options '-F -p ${port}' status`,
		{ cwd: installDir },
	);

	return !stderr;
};

export const initDB = async (installDir: string): Promise<string> => {
	if (isDbInitialized(installDir)) {
		return 'Postgres database initialized';
	}

	const { stderr }: ExecResult = await exec(
		`${PG_CTL} initdb --pgdata ${DB_DATA}`,
		{ cwd: installDir },
	);

	if (!stderr) {
		return DATABASE_START_SUCCESS;
	}

	throw new Error(`${DATABASE_START_FAILURE}: \n\n ${stderr}`);
};

export const startDatabase = async (
	installDir: string,
	name: string,
): Promise<string> => {
	const { dbPort } = (await describeApplication(name)) as PM2ProcessInstance;
	const isRunning = await isDbRunning(installDir, dbPort);
	if (isRunning) {
		return DATABASE_START_SUCCESS;
	}

	const { stderr }: ExecResult = await exec(
		`${PG_CTL} --wait --pgdata ${DB_DATA} --log ${DB_LOG_FILE} --options "-F -p ${dbPort}" start`,
		{ cwd: installDir },
	);

	if (!stderr) {
		return DATABASE_START_SUCCESS;
	}

	throw new Error(`${DATABASE_START_FAILURE}: \n\n ${stderr}`);
};

export const createUser = async (
	installDir: string,
	network: NETWORK,
	name: string,
): Promise<string> => {
	try {
		const {
			components: {
				storage: { user, password },
			},
		}: LiskConfig = await getLiskConfig(installDir, network);
		const { dbPort } = (await describeApplication(name)) as PM2ProcessInstance;

		const { stderr }: ExecResult = await exec(
			`${PG_BIN}/dropuser --if-exists ${user} --port ${dbPort};
			${PG_BIN}/createuser --createdb ${user} --port ${dbPort};
			${PG_BIN}/psql --quiet --dbname postgres --port ${dbPort} --command "ALTER USER ${user} WITH PASSWORD '${password}';";`,
			{ cwd: installDir },
		);

		if (!stderr) {
			return DATABASE_USER_SUCCESS;
		}

		throw new Error(`${DATABASE_USER_FAILURE}: \n\n ${stderr}`);
	} catch (error) {
		throw new Error(error);
	}
};

export const createDatabase = async (
	installDir: string,
	network: NETWORK,
	name: string,
): Promise<string> => {
	try {
		const {
			components: {
				storage: { database },
			},
		}: LiskConfig = await getLiskConfig(installDir, network);
		const { dbPort } = (await describeApplication(name)) as PM2ProcessInstance;

		const { stderr }: ExecResult = await exec(
			`${PG_BIN}/dropdb --if-exists ${database} --port ${dbPort};
			${PG_BIN}/createdb ${database} --port ${dbPort};
			`,
			{ cwd: installDir },
		);

		if (!stderr) {
			return DATABASE_CREATE_SUCCESS;
		}

		throw new Error(`${DATABASE_CREATE_FAILURE}: \n\n ${stderr}`);
	} catch (error) {
		throw new Error(error);
	}
};

export const stopDatabase = async (
	installDir: string,
	name: string,
): Promise<string> => {
	const { dbPort } = (await describeApplication(name)) as PM2ProcessInstance;
	const isRunning = await isDbRunning(installDir, dbPort);
	if (!isRunning) {
		return DATABASE_STATUS;
	}

	const { stderr }: ExecResult = await exec(
		`${PG_CTL} --pgdata ${DB_DATA} --log ${DB_LOG_FILE} stop`,
		{ cwd: installDir },
	);

	if (!stderr) {
		return DATABASE_STOP_SUCCESS;
	}

	throw new Error(`${DATABASE_STOP_FAILURE}: \n\n ${stderr}`);
};

export const restoreSnapshot = async (
	installDir: string,
	network: NETWORK,
	snapshotFilePath: string,
	name: string,
): Promise<string> => {
	try {
		const {
			components: {
				storage: { database, user },
			},
		}: LiskConfig = await getLiskConfig(installDir, network);
		const { dbPort } = (await describeApplication(name)) as PM2ProcessInstance;

		const { stderr }: ExecResult = await exec(
			`gunzip --force --stdout --quiet ${snapshotFilePath} | ${PG_BIN}/psql --username ${user} --dbname ${database} --port ${dbPort};`,
			{ cwd: installDir },
		);

		if (!stderr) {
			return RESTORE_SNAPSHOT_SUCCESS;
		}

		throw new Error(`${RESTORE_SNAPSHOT_FAILURE}: \n\n ${stderr}`);
	} catch (error) {
		throw new Error(error);
	}
};
