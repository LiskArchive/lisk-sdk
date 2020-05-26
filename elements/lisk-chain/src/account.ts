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
 */

export const accountDefaultValues = {
	publicKey: Buffer.alloc(0),
	balance: BigInt(0),
	nonce: BigInt(0),
	keys: {
		mandatoryKeys: [],
		optionalKeys: [],
		numberOfSignatures: 0,
	},
	asset: {},
};

type BasicTypes =
	| number
	| bigint
	| boolean
	| string
	| Buffer
	| Array<number | bigint | boolean | string | Buffer>;

export interface DefaultAsset {
	[key: string]: {
		[key: string]: BasicTypes;
	};
}

export class Account<T = DefaultAsset> {
	public address: Buffer;
	public balance: bigint;
	public publicKey: Buffer;
	public nonce: bigint;
	public keys: {
		mandatoryKeys: Buffer[];
		optionalKeys: Buffer[];
		numberOfSignatures: number;
	};
	public asset: T;

	private _stringAddress?: string;

	public constructor(account: Partial<Account<T>>) {
		if (!account.address) {
			throw new Error('Account must have address');
		}
		this.address = account.address;
		this.balance = account.balance ?? BigInt(0);
		this.publicKey = account.publicKey ?? Buffer.alloc(0);
		this.nonce = account.nonce ?? BigInt(0);
		this.keys = account.keys
			? {
					mandatoryKeys: [...account.keys.mandatoryKeys],
					optionalKeys: [...account.keys.optionalKeys],
					numberOfSignatures: account.keys.numberOfSignatures,
			  }
			: {
					mandatoryKeys: [],
					optionalKeys: [],
					numberOfSignatures: 0,
			  };
		this.asset = account.asset ?? ({} as T);
	}

	public get stringAddress(): string {
		if (this._stringAddress) {
			return this._stringAddress;
		}
		this._stringAddress = this.address.toString('hex');
		return this._stringAddress;
	}

	public static getDefaultAccount<T>(
		address: Buffer,
		defaultAsset: T,
	): Account<T> {
		return new Account<T>({
			address,
			...accountDefaultValues,
			asset: defaultAsset,
		});
	}
}
