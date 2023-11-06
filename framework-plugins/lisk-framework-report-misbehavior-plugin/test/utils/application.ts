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
import { Application } from 'lisk-sdk';
import { ReportMisbehaviorPlugin } from '../../src';

export const getReportMisbehaviorPlugin = (app: Application): ReportMisbehaviorPlugin => {
	return app['_controller']['_inMemoryPlugins'][new ReportMisbehaviorPlugin().name]['plugin'];
};

export const waitTill = async (ms: number) =>
	new Promise<void>(r =>
		setTimeout(() => {
			r();
		}, ms),
	);

export const callNetwork = async (
	promise: Promise<any>,
): Promise<{ status: number; response: any }> => {
	let response;
	let status;

	try {
		const result = await promise;
		response = result.data;
		status = result.status;
	} catch (error) {
		status = error.response.status;
		response = error.response.data;
	}

	return { status, response };
};

export const publishEvent = (app: Application, block: string): void => {
	const eventInfo = { event: 'postBlock', data: { block } };
	app['channel'].publish('app:networkEvent', eventInfo);
};
