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
		stage('Prepare workspace') {
			steps {
				deleteDir()
				checkout scm
			}
		}
		stage('Install dependencies') {
			steps {
				sh '''
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
		stage('Run tests') {
			steps {
				sh 'npm run jenkins'
			}
		}
		stage('Cleanup') {
			steps {
				deleteDir()
			}
		}
	}
}
