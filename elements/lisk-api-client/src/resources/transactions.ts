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
 *
 */
import { APIClient } from '../api_client';
import { apiMethod } from '../api_method';
import { APIResource } from '../api_resource';
import { APIHandler } from '../api_types';
import { GET, POST } from '../constants';

export class TransactionsResource extends APIResource {
	public broadcast: APIHandler;
	public get: APIHandler;
	public path: string;
	public constructor(apiClient: APIClient) {
		super(apiClient);
		this.path = '/transactions';

		/**
		 * Searches for a specified transaction in the system.
		 *
		 * ```ts
		 * client.accounts.get({ id: '222675625422353767' })
		 *   .then(res => {
		 *     console.log(res.data);
		 * });
		 * ```
		 */
		this.get = apiMethod({
			method: GET,
		}).bind(this);

		/**
		 * Submits a signed transaction object for processing by the transaction pool.
		 *
		 * ```ts
		 * client.accounts.broadcast({
		 *   id: '222675625422353767',
		 *   amount: '150000000',
		 *   fee: '1000000',
		 *   type: 0,
		 *   timestamp: 28227090,
		 *   senderId: '12668885769632475474L',
		 *   senderPublicKey: '2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
		 *   senderSecondPublicKey: '2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
		 *   recipientId: '12668885769632475474L',
		 *   signature: '2821d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c205',
		 *   signSignature: '2821d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c205',
		 *   signatures: [
		 *     '72c9b2aa734ec1b97549718ddf0d4737fd38a7f0fd105ea28486f2d989e9b3e399238d81a93aa45c27309d91ce604a5db9d25c9c90a138821f2011bc6636c60a',
		 *   ],
		 *   asset: {},
		 * })
		 *   .then(res => {
		 *     console.log(res.data);
		 * });
		 * ```
		 */
		this.broadcast = apiMethod({
			method: POST,
		}).bind(this);
	}
}
