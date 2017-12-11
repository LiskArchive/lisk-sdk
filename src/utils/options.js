const jsonDescription = 'Sets output to json. You can change the default behaviour in your config.json file.';

const messageDescription = `Specifies a source for providing a message to the command. If a string is provided directly as an argument, this option will be ignored. The message must be provided via an argument or via this option. Sources must be one of \`file\` or \`stdin\`. In the case of \`file\`, a corresponding identifier must also be provided.

	Note: if both secret passphrase and message are passed via stdin, the passphrase must be the first line.

	Examples:
	- --message file:/path/to/my/message.txt
	- --message stdin
`;

const noJsonDescription = 'Sets output to text (default). You can change the default behaviour in your config.json file.';

const passphraseDescription = `Specifies a source for your secret passphrase. Lisky will prompt you for input if this option is not set.

	Source must be one of \`prompt\`, \`pass\`, \`env\`, \`file\` or \`stdin\`. For \`pass\`, \`env\` and \`file\` a corresponding identifier must also be provided.

	Examples:
	- --passphrase prompt (default behaviour)
	- --passphrase 'pass:my secret passphrase' (should only be used where security is not important)
	- --passphrase env:SECRET_PASSPHRASE
	- --passphrase file:/path/to/my/passphrase.txt (takes the first line only)
	- --passphrase stdin (takes one line only)
`;

const secondPassphraseDescription = `Specifies a source for your second secret passphrase. For certain commands a second passphrase is necessary, in which case Lisky will prompt you for it if this option is not set. Otherwise, Lisky will assume you want to use one passphrase only.

	Source must be one of \`prompt\`, \`pass\`, \`env\`, \`file\` or \`stdin\`. For \`pass\`, \`env\` and \`file\` a corresponding identifier must also be provided.

	Examples:
	- --second-passphrase prompt (to force a prompt even when a second passphrase is not always necessary)
	- --second-passphrase 'pass:my second secret passphrase' (should only be used where security is not important)
	- --second-passphrase env:SECOND_SECRET_PASSPHRASE
	- --second-passphrase file:/path/to/my/secondPassphrase.txt (takes the first line only)
	- --second-passphrase stdin (takes one line only)
`;

const passwordDescription = `Specifies a source for your secret password. Lisky will prompt you for input if this option is not set.

	Source must be one of \`prompt\`, \`pass\`, \`env\`, \`file\` or \`stdin\`. For \`pass\`, \`env\` and \`file\` a corresponding identifier must also be provided.

	Examples:
	- --password prompt (default behaviour)
	- --password pass:password123 (should only be used where security is not important)
	- --password env:PASSWORD
	- --password file:/path/to/my/password.txt (takes the first line only)
	- --password stdin (takes the first line only)
`;

const prettyDescription = 'Prints json in pretty format rather than condensed. Has no effect if json option is false. You can change the default behaviour in your config.json file.';

const voteDescription = `Specifies the public keys for the delegate candidates you want to vote for. Takes either a string of public keys separated by commas, or a path to a file which contains the public keys.

	Examples:
	- --vote publickey1,publickey2
	- --vote file:/path/to/my/votes.txt (every public key should be on a new line)
`;

const unvoteDescription = `Specifies the public keys for the delegate candidates you want to remove your vote from. Takes either a string of public keys separated by commas, or a path to a file which contains the public keys.

	Examples:
	- --unvote publickey1,publickey2
	- --unvote file:/path/to/my/unvotes.txt (every public key should be on a new line)
`;

const options = {
	json: ['-j, --json', jsonDescription],
	message: ['-m, --message <source>', messageDescription],
	noJson: ['-t, --no-json', noJsonDescription],
	passphrase: ['-p, --passphrase <source>', passphraseDescription],
	secondPassphrase: ['-s, --second-passphrase <source>', secondPassphraseDescription],
	password: ['-w, --password <source>', passwordDescription],
	pretty: ['--pretty', prettyDescription],
	unvote: ['--unvote <source...>', unvoteDescription],
	vote: ['--vote <source...>', voteDescription],
};

export default options;
