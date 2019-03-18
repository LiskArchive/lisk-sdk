/*
 * Copyright © 2018 Lisk Foundation
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
 */

@Library('lisk-jenkins') _

def setup() {
	cleanWs()
	unstash 'build'
	nvm(getNodejsVersion()) {
		sh '''
		# teardown() should have killed all node processes but we want to be sure
		# this shouldn't hurt assuming the 'lisk-core' jenkins nodes have 1 executor
		killall --verbose --wait node || true
		dropdb --if-exists lisk_dev
		createdb lisk_dev
		NODE_ENV=test npm start >.app.log 2>&1 &
		'''
	}
	// wait for the Core API to be reachable
	timeout(1) {
		waitUntil {
			script {
				def api_available = sh script: 'curl --silent http://localhost:4000/api/node/constants >/dev/null', returnStatus: true
				return (api_available == 0)
			}
		}
	}
}

def run_test(test_name) {
	ansiColor('xterm') {
		timestamps {
			nvm(getNodejsVersion()) {
				sh 'npm run mocha:'+ "${test_name}" +' ${LISK_MOCHA_RUNNER_OPTIONS}'
			}
		}
	}
}

def teardown(test_name) {
	// teardown() gets called in post actions and so we don't want it to fail
	try {
		nvm(getNodejsVersion()) {
			sh """
			rm -rf coverage_${test_name}; mkdir -p coverage_${test_name}
			npx istanbul report --root framework/test/mocha/.coverage-unit/ --dir framework/test/mocha/.coverage-unit/
			cp framework/test/mocha/.coverage-unit/lcov.info coverage_${test_name}/ || true
			npx istanbul report cobertura --root framework/test/mocha/.coverage-unit/ --dir framework/test/mocha/.coverage-unit/
			cp framework/test/mocha/.coverage-unit/cobertura-coverage.xml coverage_${test_name}/ || true
			curl --silent http://localhost:4000/coverage/download --output functional-coverage.zip
			unzip functional-coverage.zip lcov.info -d coverage_${test_name}/functional/
			"""
		}
	} catch(err) {
		println "Could gather coverage statistics:\n${err}"
	}
	stash name: "coverage_${test_name}", includes: "coverage_${test_name}/"
	timeout(1) {
		sh 'killall --verbose --wait node || true'
	}
	sh """
	mv .app.log lisk_${test_name}.stdout.txt || true
	mv logs/devnet/lisk.log lisk_${test_name}.log || true
	"""
	archiveArtifacts artifacts: 'lisk_*.log', allowEmptyArchive: true
	archiveArtifacts artifacts: 'lisk_*.stdout.txt', allowEmptyArchive: true
	cleanWs()
}


properties([
	parameters([
		string(name: 'LISK_MOCHA_RUNNER_OPTIONS', defaultValue: '-- --grep @slow|@unstable --invert', description: 'Please check readme to see available test tags. Example: `-- --grep something`', ),
		// read by the application
		string(name: 'LOG_LEVEL', defaultValue: 'error', description: 'To get desired build log output change the log level', ),
		string(name: 'FILE_LOG_LEVEL', defaultValue: 'error', description: 'To get desired file log output change the log level', ),
		// used by tests
		string(name: 'LOG_DB_EVENTS', defaultValue: 'false', description: 'To get detailed info on db events log.', ),
		string(name: 'SILENT', defaultValue: 'true', description: 'To turn off test debug logs.', )
	 ])
])


pipeline {
	agent { node { label 'lisk-core' } }

	environment {
		MAX_TASK_LIMIT = '20'
	}

	stages {
		stage('Build') {
			steps {
				nvm(getNodejsVersion()) {
					sh '''
					npm ci
					# needed by one of the "Functional HTTP GET tests"
					git rev-parse HEAD >REVISION
					'''
				}
				stash name: 'build'
			}
		}
		// dummy stage to have consistent ouput in both blue ocean and the classi webui
		stage('Parallel: tests wrapper') {
			parallel {
				stage('Linter') {
					agent { node { label 'lisk-core' } }
					steps {
						unstash 'build'
						nvm(getNodejsVersion()) {
							sh 'npm run lint'
						}
					}
				}
				stage('Functional HTTP GET tests') {
					agent { node { label 'lisk-core' } }
					steps {
						setup()
						run_test('functional:get')
					}
					post {
						cleanup {
							teardown('get')
						}
					}
				}
				stage('Functional HTTP POST tests') {
					agent { node { label 'lisk-core' } }
					steps {
						setup()
						run_test('functional:post')
					}
					post {
						cleanup {
							teardown('post')
						}
					}
				}
				stage ('Functional WS tests') {
					agent { node { label 'lisk-core' } }
					steps {
						setup()
						run_test('functional:ws')
					}
					post {
						cleanup {
							teardown('ws')
						}
					}
				}
				stage('Unit tests') {
					agent { node { label 'lisk-core' } }
					steps {
						setup()
						run_test('unit')
					}
					post {
						cleanup {
							teardown('unit')
						}
					}
				}
				stage('Integation tests') {
					agent { node { label 'lisk-core' } }
					steps {
						setup()
						timeout(10) {
							run_test('integration')
						}
					}
					post {
						cleanup {
							teardown('integration')
						}
					}
				}
			}
		}
	}
	post {
		always {
			// teardown() should have run cleanWs()
			// but it can't hurt to make sure no old coverage files remain
			sh 'rm -rf coverage; mkdir -p coverage'
			script {
				dir('coverage') {
					['get', 'post', 'ws', 'unit', 'integration'].each {
						// some test stages might have failed and have no coverage data
						try {
							unstash "coverage_${it}"
						} catch(err) {
							println "Could not unstash ${it}. Continuing."
						}
					}
				}
				// it won't do to fail in a post action
				try {
					nvm(getNodejsVersion()) {
						sh '''
						find coverage/ -name lcov.info |sed 's/^/-a /' |xargs lcov -o coverage/merged.lcov
						sed -i -r -e "s#$WORKSPACE/#./#g" coverage/merged.lcov
						cp ~/.core_coveralls.yml .coveralls.yml
						npx coveralls <coverage/merged.lcov
						# remove prefix from package names
						sed -i -r -e "s/${WORKSPACE##*/}\\.//" coverage/coverage_*/cobertura-coverage.xml
						'''
					}
					cobertura coberturaReportFile: 'coverage_*/cobertura-coverage.xml'
				} catch(err) {
					println "Could not report coverage statistics:\n${err}"
				} finally {
					sh 'rm -f .coveralls.yml'
				}
			}
		}
		failure {
			script {
				build_info = getBuildInfo()
				liskSlackSend('danger', "Build ${build_info} failed (<${env.BUILD_URL}/console|console>, <${env.BUILD_URL}/changes|changes>)")
			}
		}
		cleanup {
			cleanWs()
		}
	}
}
// vim: filetype=groovy
