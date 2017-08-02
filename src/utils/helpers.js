export const COMMAND_TYPES = ['account', 'address', 'block', 'delegate', 'transaction'];

export const SINGULARS = {
	accounts: 'account',
	addresses: 'address',
	blocks: 'block',
	delegates: 'delegate',
	transactions: 'transaction',
};

export const deAlias = type => (
	type === 'address'
		? 'account'
		: type
);

export const shouldUseJsonOutput = (config, options) =>
	(options.json === true || config.json === true)
		&& options.json !== false;
