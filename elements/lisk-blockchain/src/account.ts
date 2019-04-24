export interface Account {
	readonly address: string;
	readonly balance: string;
	readonly publicKey?: string;
	readonly votedDelegatesPublicKeys?: ReadonlyArray<string>;
	readonly votes?: string;
	readonly reward?: string;
}

export const createDefaultAccount = (address: string) => ({
	address,
	balance: '0',
});
