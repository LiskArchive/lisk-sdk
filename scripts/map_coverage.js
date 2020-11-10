// Referenced from https://github.com/facebook/jest/blob/master/scripts/mapCoverage.js
/* eslint-disable */
const path = require('path');
const istanbulReport = require('istanbul-lib-report');
const istanbulReports = require('istanbul-reports');
const istanbulCoverage = require('istanbul-lib-coverage');

const filePath = process.argv[2];

if (!filePath) {
	throw new Error('file path needs to be provided');
}

const coverage = require(path.join(process.cwd(), filePath));

const map = istanbulCoverage.createCoverageMap();

Object.keys(coverage).forEach(filename =>
	map.addFileCoverage(coverage[filename]),
);

const context = istanbulReport.createContext({ coverageMap: map });

['cobertura'].forEach(reporter =>
	istanbulReports.create(reporter, {}).execute(context),
);
