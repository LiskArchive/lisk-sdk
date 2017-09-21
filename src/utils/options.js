const jsonDescription = 'Sets output to json.';

const noJsonDescription = 'Sets output to text (default). You can change this in your config.json file.';

const passphraseDescription = `Specifies a source for your secret passphrase. Lisky will prompt you for input if this option is not set. Source must be one of \`env\`, \`file\` or \`stdin\`. Except for \`stdin\`, a corresponding identifier must also be provided.

	Examples:
	- --passphrase 'pass:my secret pass phrase' (should only be used where security is not important)
	- --passphrase env:SECRET_PASSPHRASE
	- --passphrase file:/path/to/my/passphrase.txt (takes the first line only)
	- --passphrase stdin (takes the first line only)
`;

const passwordDescription = `Specifies a source for your secret password. Lisky will prompt you for input if this option is not set. Source must be one of \`env\`, \`file\` or \`stdin\`. Except for \`stdin\`, a corresponding identifier must also be provided.

	Examples:
	- --password pass:password123 (should only be used where security is not important)
	- --password env:PASSWORD
	- --password file:/path/to/my/password.txt (takes the first line only)
	- --password stdin (takes the first line only)
`;

const messageDescription = `Specifies a source for providing a message to the command. If a string is provided directly as an argument, this option will be ignored. The message must be provided via an argument or via this option. Sources must be one of \`file\` or \`stdin\`. In the case of \`file\`, a corresponding identifier must also be provided.

	Note: if both secret passphrase and message are passed via stdin, the passphrase must be the first line.

	Examples:
	- --message file:/path/to/my/message.txt
	- --message stdin
`;

const options = {
	json: ['-j, --json', jsonDescription],
	noJson: ['-t, --no-json', noJsonDescription],
	passphrase: ['-p, --passphrase <source>', passphraseDescription],
	password: ['-w, --password <source>', passwordDescription],
	message: ['-m, --message <source>', messageDescription],
};

export default options;
