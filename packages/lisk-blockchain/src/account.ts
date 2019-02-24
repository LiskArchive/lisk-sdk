export interface Account {
	readonly address: string;
	readonly balance: string;
}

export const createDefaultAccount = (address: string) => ({
	address,
	balance: '0',
});
