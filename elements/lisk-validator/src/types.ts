/*
 * Copyright © 2021 Lisk Foundation
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

import { ErrorObject } from 'ajv';

export { DataValidateFunction, DataValidationCxt } from 'ajv/dist/types';

export interface LiskErrorObject extends Omit<ErrorObject, 'instancePath' | 'schemaPath'> {
	dataPath?: string; // This property is replaced with "instancePath" in newer version
	schemaPath?: string; // This property was optional earlier version of ajv
}
