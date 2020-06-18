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

export class Node<V = object, K = number | bigint> {
	public key: K;
	public value: V;

	public constructor(key: K, value: V) {
		this.key = key;
		this.value = value;
	}

	public clone(): Node<V, K> {
		return new Node(this.key, this.value);
	}
}
