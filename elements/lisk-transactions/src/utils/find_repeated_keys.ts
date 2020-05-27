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
 *
 */

import { hexToBuffer } from "@liskhq/lisk-cryptography";

export const findRepeatedKeys = (
	keysA: ReadonlyArray<string>,
	keysB: ReadonlyArray<string>,
): string[] => keysA.filter(aKey => keysB.includes(aKey));

export const convertKeysToBuffer = (keys?: {
	readonly mandatoryKeys: Array<Readonly<string>>;
	readonly optionalKeys: Array<Readonly<string>>;
}): {
	readonly mandatoryKeys: Array<Readonly<Buffer>>;
	readonly optionalKeys: Array<Readonly<Buffer>>;
} => {
	const mandatoryKeys = keys?.mandatoryKeys.map(k => hexToBuffer(k));
	const optionalKeys = keys?.optionalKeys.map(k => hexToBuffer(k));

	return { mandatoryKeys: mandatoryKeys as Buffer[], optionalKeys: optionalKeys as Buffer[] };
}
