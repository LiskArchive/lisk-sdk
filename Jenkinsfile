/*
 * Copyright © 2017 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
pipeline {
	agent { node { label 'lisk-js' } }
	stages {
		stage('Install dependencies') {
			steps {
				sh '''
				cp -r ~/cache/${CHANGE_TARGET:-${BRANCH_NAME:-development}}/node_modules ./ || true
				npm install --verbose
				cp ~/.coveralls.yml .
				'''
			}
		}
		stage('Run lint') {
			steps{
				sh 'grunt eslint-ci'
			}
		}
		stage('Run node tests') {
			steps {
				sh 'npm run jenkins'
			}
		}
		stage('Run browser tests') {
			steps {
				sh '''
				npm run build
				npm run build:browsertest
				HTTP_PORT=808${EXECUTOR_NUMBER:-0}
				npm run serve:browsertest -- -p $HTTP_PORT >access.log 2>&1 &
				npm run test:browser -- --config baseUrl=http://localhost:$HTTP_PORT --browser chrome
				'''
			}
		}
	}
	post {
		success {
			deleteDir()
		}
		failure {
			archiveArtifacts allowEmptyArchive: true, artifacts: 'cypress/screenshots/'
		}
	}
}
