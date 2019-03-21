const systemDirs = require('../../../../../../src/controller/config/dirs');

describe('systemDirs', () => {
	it('Should return directories configuration with given app label.', () => {
		// Arrange
		const appLabel = 'LABEL';
		const rootDir = process.cwd();

		// Act
		const dirsObj = systemDirs(appLabel);

		// Assert
		expect(dirsObj).toEqual({
			root: rootDir,
			temp: `${rootDir}/tmp/${appLabel}/`,
			sockets: `${rootDir}/tmp/${appLabel}/sockets`,
			pids: `${rootDir}/tmp/${appLabel}/pids`,
		});
	});
});
