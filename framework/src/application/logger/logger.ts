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

// Levels
const colors = {
	reset: '\x1b[0m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	meganta: '\x1b[35m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',
};

const setColor = (color: keyof typeof colors, str: string): string =>
	`${colors[color]}${str}${colors.reset}`;

const levelToName = {
	10: setColor('yellow', 'TRACE'),
	20: setColor('meganta', 'DEBUG'),
	30: setColor('cyan', 'INFO'),
	40: setColor('yellow', 'WARN'),
	50: setColor('red', 'ERROR'),
	60: setColor('red', 'FATAL'),
} as { [key: number]: string };

interface LogObject {
	[key: string]: string | number | Error | undefined;
}

class ConsoleLog {
	// eslint-disable-next-line
	write(rec: LogObject) {
		try {
			const { time, level, name, msg, module, err, hostname, pid, src, v, ...others } = rec;
			let log = util.format(
				'%s %s %s: %s (module=%s)\n',
				new Date(time as string).toLocaleTimeString('en-US', { hour12: false }),
				levelToName[level as number],
				name,
				msg,
				module ?? 'unknown',
			);
			if (err) {
				log += util.format(
					'Message: %s \n Trace: %s \n',
					(err as Error).message,
					(err as Error).stack,
				);
			}
			if (Object.keys(others).length > 0) {
				log += util.format(
					'%s \n',
					JSON.stringify(
						others,
						(_, val) => {
							if (typeof val === 'object') {
								for (const k of Object.keys(val)) {
									// eslint-disable-next-line
									if (typeof val[k] === 'bigint') {
										// eslint-disable-next-line
										val[k] = val[k].toString();
									}
									// eslint-disable-next-line
									if (Buffer.isBuffer(val[k])) {
										// eslint-disable-next-line
										val[k] = val[k].toString('base64');
									}
								}
							}
							// eslint-disable-next-line
							return val;
						},
						' ',
					),
				);
			}
			process.stdout.write(log);
		} catch (err) {
			console.error('Failed on logging', rec.err);
		}
	}
}

interface LoggerInput {
	readonly fileLogLevel: string;
	readonly consoleLogLevel: string;
	readonly logFilePath: string;
	readonly module: string;
}

export interface Logger {
	readonly trace: (data?: object | unknown, message?: string) => void;
	readonly debug: (data?: object | unknown, message?: string) => void;
	readonly info: (data?: object | unknown, message?: string) => void;
	readonly warn: (data?: object | unknown, message?: string) => void;
	readonly error: (data?: object | unknown, message?: string) => void;
	readonly fatal: (data?: object | unknown, message?: string) => void;
	readonly level: () => number;
}

export const createLogger = ({
	fileLogLevel,
	consoleLogLevel,
	logFilePath,
	module,
}: LoggerInput): Logger => {
	const consoleSrc = consoleLogLevel === 'debug' || consoleLogLevel === 'trace';
	const consoleStream =
		consoleLogLevel !== 'none'
			? [
					{
						type: 'raw',
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						level: consoleLogLevel as bunyan.LogLevel,
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
						stream: new ConsoleLog() as any,
					},
			  ]
			: [];
	const fileSrc = fileLogLevel === 'debug' || fileLogLevel === 'trace';
	const fileStream =
		fileLogLevel !== 'none'
			? [
					{
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						level: fileLogLevel as bunyan.LogLevel,
						path: logFilePath,
					},
			  ]
			: [];
	const streams = [...consoleStream, ...fileStream];
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
	return bunyan.createLogger({
		name: 'lisk-framework',
		streams,
		src: consoleSrc || fileSrc,
		// eslint-disable-next-line
		serializers: { err: bunyan.stdSerializers.err },
		module,
	}) as Logger;
};
