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
/* eslint-disable max-classes-per-file */
import * as path from 'path';
import * as fs from 'fs';
import * as bunyan from 'bunyan';
import * as util from 'util';

export const createDirIfNotExist = (filePath: string): void => {
	const dir = path.dirname(filePath);
	if (fs.existsSync(dir)) {
		return;
	}
	fs.mkdirSync(dir, { recursive: true });
};

const levelToName = {
	10: 'TRACE',
	20: 'DEBUG',
	30: 'INFO',
	40: 'WARN',
	50: 'ERROR',
	60: 'FATAL',
} as { [key: number]: string };

interface LogObject {
	[key: string]: string | number | Error | undefined | bigint | Buffer;
}

const parseStructData = (input: Record<string, unknown>, trace: boolean, err?: Error): string => {
	const keys = Object.keys(input);
	if (keys.length === 0 && !err) {
		return '';
	}
	const pairs = [];
	for (const key of keys) {
		const value = input[key];
		switch (typeof value) {
			case 'string':
			case 'number':
				pairs.push(`${key}=${value}`);
				break;
			case 'bigint':
				pairs.push(`${key}=${value.toString()}`);
				break;
			case 'boolean':
				pairs.push(`${key}=${value ? 'true' : 'false'}`);
				break;
			case 'object':
				if (Buffer.isBuffer(value)) {
					pairs.push(`${key}=${value.toString('hex')}`);
				}
				if (value instanceof Error) {
					pairs.push(`error=${value.message}`);
				}
				break;
			default:
				continue;
		}
	}
	if (err) {
		pairs.push(`err=${err.message}`);
		if (err.stack && trace) {
			pairs.push(`trace=${err.stack}`);
		}
	}
	return pairs.length > 0 ? ` [${pairs.join(' ')}]` : '';
};

class ConsoleLog {
	// eslint-disable-next-line no-useless-constructor
	public constructor(private readonly _trace = false) {}

	// eslint-disable-next-line
	write(rec: LogObject) {
		try {
			const { time, level, name, msg, module, err, hostname, pid, src, v, ...others } = rec;
			const structData = parseStructData(others, this._trace, err as Error | undefined);
			const log = util.format(
				'%s %s %s %s %d%s %s\n',
				new Date(time as string).toISOString(),
				levelToName[level as number],
				hostname,
				name,
				pid,
				structData,
				msg,
			);
			if ((level as number) >= 40) {
				process.stderr.write(log);
			} else {
				process.stdout.write(log);
			}
		} catch (err) {
			console.error('Failed on logging', err);
		}
	}
}

interface LoggerInput {
	readonly logLevel: string;
	readonly name: string;
}

/** Logger interface, to create log messages. */
export interface Logger {
	readonly trace: (data?: Record<string, unknown> | unknown, message?: string) => void;
	readonly debug: (data?: Record<string, unknown> | unknown, message?: string) => void;
	readonly info: (data?: Record<string, unknown> | unknown, message?: string) => void;
	readonly warn: (data?: Record<string, unknown> | unknown, message?: string) => void;
	readonly error: (data?: Record<string, unknown> | unknown, message?: string) => void;
	readonly fatal: (data?: Record<string, unknown> | unknown, message?: string) => void;
	readonly level: () => number;
}

export const createLogger = ({ logLevel, name }: LoggerInput): Logger => {
	const consoleStream =
		logLevel !== 'none'
			? [
					{
						type: 'raw',
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						level: logLevel as bunyan.LogLevel,
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
						stream: new ConsoleLog(logLevel === 'trace') as any,
					},
			  ]
			: [];
	return bunyan.createLogger({
		name,
		streams: consoleStream,
		serializers: { err: bunyan.stdSerializers.err },
	}) as Logger;
};
