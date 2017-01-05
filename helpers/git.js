'use strict';
var childProcess = require('child_process');

function getLastCommit() {
    try {
        return childProcess.execSync('git rev-parse HEAD').toString().trim();
    }
    catch (err) {
        return '';
    }
}

module.exports = {
    getLastCommit: getLastCommit
};