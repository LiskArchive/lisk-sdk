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
import { Request, Response } from 'express';
import { BaseChannel } from 'lisk-framework';

export const helloController = (_channel: BaseChannel) => async (
	_req: Request,
	res: Response,
): Promise<void> => {
	res.status(200).send(await _channel.invoke('app:getNodeStatus'));
};
