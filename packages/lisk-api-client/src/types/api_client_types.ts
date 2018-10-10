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
/* tslint:disable no-mixed-interface */
export type ApiHandler = (
	this: Resource,
	args: ReadonlyArray<number | string | object>,
) => Promise<ApiResponse | Error>;

export interface ApiResponse {
	readonly data: object;
	readonly links: object;
	readonly meta: object;
}

export interface HashMap {
	readonly [key: string]: string;
}

export interface RequestConfig {
	readonly defaultData?: object;
	readonly method: string;
	readonly path?: string;
	readonly retry?: boolean;
	readonly urlParams?: ReadonlyArray<string>;
	readonly validator?: (data: object) => void;
}

export interface Resource {
	readonly headers?: HashMap;
	readonly request: (
		data: object,
		retry: boolean,
	) => Promise<ApiResponse | Error>;
	readonly resourcePath?: string;
}
