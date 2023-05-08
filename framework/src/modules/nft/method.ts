/*
 * Copyright © 2023 Lisk Foundation
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
import { BaseMethod } from '../base_method';
import { InteroperabilityMethod, ModuleConfig } from './types';
import { InternalMethod } from './internal_method';

export class NFTMethod extends BaseMethod {
	// @ts-expect-error TODO: unused error. Remove when implementing.
	private _config!: ModuleConfig;
	// @ts-expect-error TODO: unused error. Remove when implementing.
	private _interoperabilityMethod!: InteroperabilityMethod;
	// @ts-expect-error TODO: unused error. Remove when implementing.
	private _internalMethod!: InternalMethod;

	public init(config: ModuleConfig): void {
		this._config = config;
	}

	public addDependencies(
		interoperabilityMethod: InteroperabilityMethod,
		internalMethod: InternalMethod,
	) {
		this._interoperabilityMethod = interoperabilityMethod;
		this._internalMethod = internalMethod;
	}
}
