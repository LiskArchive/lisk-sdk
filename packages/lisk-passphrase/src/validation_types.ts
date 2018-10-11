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

export interface PassphraseRegularExpression {
	readonly uppercaseRegExp: RegExp;
	readonly whitespaceRegExp: RegExp;
}
export interface PassphraseError {
	readonly actual: number | boolean | string;
	readonly code: string;
	readonly expected: number | boolean | string;
	readonly location?: ReadonlyArray<number>;
	readonly message: string;
}

export type RegExpReturn = RegExpMatchArray | null;

export interface WordListObject {
	readonly keys: string;
}
