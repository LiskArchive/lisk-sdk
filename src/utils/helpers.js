export const deAlias = type => (
	type === 'address'
		? 'account'
		: type
);

export const shouldUseJsonOutput = (config, options) =>
	(options.json === true || config.json === true)
		&& options.json !== false;
