const child_process = require('child_process');

const MOCHA_PATH = process.env.MOCHA_PATH || 'node_modules/.bin/_mocha';

const children = {};

const spawn = (testFile, mochaOptions) => {
	const child = child_process.spawn(MOCHA_PATH, [testFile, ...mochaOptions], {
		cwd: `${__dirname}/../../../../..`,
		detached: true,
		stdio: 'inherit',
	});

	children[child.pid] = child;
	console.info(`(${child.pid}) ${MOCHA_PATH} ${testFile} ${[...mochaOptions]}`);

	let error = null;
	child.once('error', err => {
		error = err;
		return child.kill('SIGTERM');
	});

	return new Promise((resolve, reject) => {
		child.once('exit', code => {
			// We need to delete the child process from the queue once it exists.
			delete children[child.pid];
			if (code === 0) {
				return resolve(testFile);
			}

			return reject(code, error);
		});
	});
};

const killAll = () =>
	Object.values(children).forEach(child => child.kill('SIGINT'));

module.exports = {
	spawn,
	killAll,
};
