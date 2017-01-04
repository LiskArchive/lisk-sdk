'use strict';
var childProcess = require('child_process');

/**
 @throws Will throw an error if the git is not installed or not a git repository.
 */
function getLastCommit() {
    return childProcess.execSync('git rev-parse HEAD').toString().trim();
}

module.exports = {
    getLastCommit: getLastCommit
};