import lockfile from 'lockfile';
import * as sandbox from 'sinon';

afterEach(() => sandbox.restore());

after(() => {
	const configLockfilePath = `${process.env.LISK_COMMANDER_CONFIG_DIR}/config.lock`;

	return lockfile.unlockSync(configLockfilePath);
});
