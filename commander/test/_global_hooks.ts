import lockfile from 'lockfile';

afterEach(() => sandbox.restore());

after(() => {
	const configLockfilePath = `${
		process.env.LISK_COMMANDER_CONFIG_DIR
	}/config.lock`;

	return lockfile.unlockSync(configLockfilePath);
});
