/* eslint-disable */
const istanbulReport = require('istanbul-lib-report');
const istanbulReports = require('istanbul-reports');
const istanbulCoverage = require('istanbul-lib-coverage');

const filePath = process.argv[2];
const coverage = require(filePath);

const map = istanbulCoverage.createCoverageMap();

const mapFileCoverage = fileCoverage => {
	fileCoverage.path = fileCoverage.path.replace(
		/(.*packages\/.*\/)(build)(\/.*)/,
	);
	return fileCoverage;
};

Object.keys(coverage).forEach(filename =>
	map.addFileCoverage(mapFileCoverage(coverage[filename])),
);

const context = istanbulReport.createContext({ coverageMap: map });

['cobertura'].forEach(reporter =>
	istanbulReports.create(reporter, {}).execute(context),
);
