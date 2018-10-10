/*
 * Copyright © 2018 Lisk Foundation
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
import { GET } from '../constants';
import { ApiHandler } from '../types/api_client_types';

export class DelegatesResource extends APIResource {
  public get:ApiHandler;
  public getForgers: ApiHandler;
  public getForgingStatistics:ApiHandler;
  public getStandby: ApiHandler;
  public path: string;

  public constructor(apiClient: APIClient) {
		super(apiClient);
		this.path = '/delegates';

		this.get = apiMethod({
			defaultData: {
				sort: 'rank:asc',
			},
			method: GET,
		}).bind(this);

		this.getStandby = apiMethod({
			defaultData: {
				offset: 101,
				sort: 'rank:asc',
			},
			method: GET,
		}).bind(this);

		this.getForgers = apiMethod({
			method: GET,
			path: '/forgers',
		}).bind(this);

		this.getForgingStatistics = apiMethod({
			method: GET,
			path: '/{address}/forging_statistics',
			urlParams: ['address'],
		}).bind(this);
	}
}
