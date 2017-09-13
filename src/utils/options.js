const jsonDescription = 'Sets output to json.';

const noJsonDescription = 'Sets output to text (default). You can change this in your config.json file.';

const passphraseDescription = `
Specifies a source for your secret passphrase. Lisky will prompt you for input if this option is not set.
Source must be one of \`env\`, \`file\` or \`stdin\`. Except for \`stdin\`, a corresponding identifier must also be provided.

Examples:
- \`--passphrase 'pass:my secret pass phrase'\` (should only be used where security is not important)
- \`--passphrase env:SECRET_PASSPHRASE\`
- \`--passphrase file:/path/to/my/passphrase.txt\` (takes the first line only)
- \`--passphrase stdin\`
`.trim();

const options = {
	json: ['-j, --json', jsonDescription],
	noJson: ['-t, --no-json', noJsonDescription],
	passphrase: ['-p, --passphrase <source>', passphraseDescription],
};

export default options;
