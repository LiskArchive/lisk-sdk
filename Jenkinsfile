def initBuild() {
	try {
		sh '''
		pkill -f app.js -9 || true
		sudo service postgresql restart
		dropdb lisk_test || true
		createdb lisk_test
		'''
		deleteDir()
		checkout scm
	} catch (err) {
		echo "Error: ${err}"
		currentBuild.result = 'FAILURE'
		report()
		error('Stopping build: initializing build failed')
	}
}

def buildDependency() {
	try {
		sh '''
		rsync -axl -e "ssh -oUser=jenkins" master-01:/var/lib/jenkins/lisk/node_modules/ "$WORKSPACE/node_modules/"
		npm install
		'''
	} catch (err) {
		echo "Error: ${err}"
		currentBuild.result = 'FAILURE'
		report()
		error('Stopping build: building dependencies failed')
	}
}

def startLisk() {
	try {
		sh '''
		cp test/data/config.json test/data/genesisBlock.json .
		NODE_ENV=test JENKINS_NODE_COOKIE=dontKillMe ~/start_lisk.sh
		'''
	} catch (err) {
		echo "Error: ${err}"
		currentBuild.result = 'FAILURE'
		report()
		error('Stopping build: Lisk failed to start')
	}
}

def cleanup() {
	try {
		sh 'pkill -f app.js -9'
	} catch (err) {
		echo "Error: ${err}"
		currentBuild.result = 'FAILURE'
		report()
		error('Stopping build: cleanup failed')
	}
}

def cleanup_master() {
	try{
		dir('/var/lib/jenkins/coverage/') {
			sh '''
			rm -rf node-0*
			rm -rf *.zip
			rm -rf coverage-unit/*
			rm -f merged-lcov.info
			rm -rf lisk/*
			rm -f coverage.json
			rm -f lcov.info
			'''
		}
	} catch (err) {
		echo "Error: ${err}"
		currentBuild.result = 'FAILURE'
		report()
		error('Stopping build: master cleanup failed')
	}
}

def run_action(action) {
	try {
		sh """
		cd "\$(echo ${env.WORKSPACE} | cut -f 1 -d '@')"
		npm run ${action}
		"""
	} catch (err) {
		echo "Error: ${err}"
		currentBuild.result = 'FAILURE'
		report()
		error('Stopping build: ' + action + ' failed')
	}	
}

def report_coverage(node) {
	try {
		sh """
		export HOST=127.0.0.1:4000
		# Gathers tests into single lcov.info
		npm run coverageReport
		npm run fetchCoverage
		# Submit coverage reports to Master
		scp -r test/.coverage-unit/* jenkins@master-01:/var/lib/jenkins/coverage/coverage-unit/
		scp test/.coverage-func.zip jenkins@master-01:/var/lib/jenkins/coverage/coverage-func-node-${node}.zip
		"""
	} catch (err) {
		echo "Error: ${err}"
		currentBuild.result = 'FAILURE'
		report()
		error('Stopping build: reporting coverage statistics failed node-' + node)
	}
}

def report(){
	step([
		$class: 'GitHubCommitStatusSetter',
		errorHandlers: [[$class: 'ShallowAnyErrorHandler']],
		contextSource: [$class: 'ManuallyEnteredCommitContextSource', context: 'jenkins-ci/func-unit'],
		statusResultSource: [
			$class: 'ConditionalStatusResultSource',
			results: [
					[$class: 'BetterThanOrEqualBuildResult', result: 'SUCCESS', state: 'SUCCESS', message: 'This commit looks good :)'],
					[$class: 'BetterThanOrEqualBuildResult', result: 'FAILURE', state: 'FAILURE', message: 'This commit failed testing :('],
					[$class: 'AnyBuildResult', state: 'FAILURE', message: 'This build some how escaped evaluation']
			]
		]
	])
	if ( currentBuild.result == 'FAILURE' ) {
		def pr_branch = ''
		if (env.CHANGE_BRANCH != null) {
			pr_branch = " (${env.CHANGE_BRANCH})"
		}
		slackSend color: 'danger', message: "Build #${env.BUILD_NUMBER} of <${env.BUILD_URL}|${env.JOB_NAME}>${pr_branch} failed (<${env.BUILD_URL}/console|console>, <${env.BUILD_URL}/changes|changes>)", channel: '#lisk-core-jenkins'
	}
}

lock(resource: "Lisk-Core-Nodes", inversePrecedence: true) {

	properties([
		parameters([
			string(name: 'JENKINS_PROFILE', defaultValue: 'jenkins', description: 'To build cache dependencies and run slow test, change this value to jenkins-extensive.', )
		 ])
	])

	stage ('Prepare Workspace') {
		parallel(
			"Build cached dependencies" : {
				node('master-01'){
					try {
						deleteDir()
						checkout scm
						sh """
						if [ ${params.JENKINS_PROFILE} = "jenkins-extensive" ]; then
							rm -Rf "${env.WORKSPACE}/node_modules/"
							npm install
							rsync -axl --delete "${env.WORKSPACE}/node_modules/" /var/lib/jenkins/lisk/node_modules/
						fi
						"""
					} catch (err) {
						echo "Error: ${err}"
						currentBuild.result = 'FAILURE'
						report()
						error('Stopping build: caching dependencies failed')
					}
				}
			},
			"Build Node-01" : {
				node('node-01'){
					initBuild()
				}
			},
			"Build Node-02" : {
				node('node-02'){
					initBuild()
				}
			},
			"Build Node-03" : {
				node('node-03'){
					initBuild()
				}
			},
			"Build Node-04" : {
				node('node-04'){
					initBuild()
				}
			},
			"Build Node-05" : {
				node('node-05'){
					initBuild()
				}
			},
			"Initialize Master Workspace" : {
				node('master-01'){
					cleanup_master()
				}
			}
		)
	}

	stage ('Build Dependencies') {
		parallel(
			"Build Dependencies Node-01" : {
				node('node-01'){
					buildDependency()
				}
			},
			"Build Dependencies Node-02" : {
				node('node-02'){
					buildDependency()
				}
			},
			"Build Dependencies Node-03" : {
				node('node-03'){
					buildDependency()
				}
			},
			"Build Dependencies Node-04" : {
				node('node-04'){
					buildDependency()
				}
			},
			"Build Dependencies Node-05" : {
				node('node-05'){
					buildDependency()
				}
			}
		)
	}

	stage ('Start Lisk') {
		parallel(
			"Start Lisk Node-01" : {
				node('node-01'){
					startLisk()
				}
			},
			"Start Lisk Node-02" : {
				node('node-02'){
					startLisk()
				}
			},
			"Start Lisk Node-03" : {
				node('node-03'){
					startLisk()
				}
			},
			"Start Lisk Node-04" : {
				node('node-04'){
					startLisk()
				}
			},
			"Start Lisk Node-05" : {
				node('node-05'){
					startLisk()
				}
			}
		)
	}

	stage ('Parallel Tests') {
		parallel(
			"ESLint" : {
				node('node-01'){
					run_action('eslint')
				}
			},
			"Functional HTTP GET tests" : {
				node('node-01'){
					if (params.JENKINS_PROFILE == 'jenkins-extensive') {
						run_action('test-functional-http-get-extensive')
					} else {
						run_action('test-functional-http-get')
					}
				}
			}, // End node-01 tests
			"Functional HTTP POST tests" : {
				node('node-02'){
					run_action('test-functional-http-post')
				}
			}, // End Node-02 tests
			"Functional WS tests" : {
				node('node-03'){
					if (params.JENKINS_PROFILE == 'jenkins-extensive') {
						run_action('test-functional-ws-extensive')
					} else {
						run_action('test-functional-ws')
					}
				}
			}, // End Node-03 tests
			"Unit Tests" : {
				node('node-04'){
					if (params.JENKINS_PROFILE == 'jenkins-extensive') {
						run_action('test-unit-extensive')
					} else {
						run_action('test-unit')
					}
				}
			}, // End Node-04 unit tests
			"Functional Transaction pool" : {
				node('node-05'){
					run_action('test-functional-pool')
				}
			} // End Node-05 tests
		) // End Parallel
	}

	stage ('Gather Coverage') {
		parallel(
			"Gather Coverage Node-01" : {
				node('node-01'){
					report_coverage('01')
				}
			},
			"Gather Coverage Node-02" : {
				node('node-02'){
					report_coverage('02')
				}
			},
			"Gather Coverage Node-03" : {
				node('node-03'){
					report_coverage('03')
				}
			},
			"Gather Coverage Node-04" : {
				node('node-04'){
					report_coverage('04')
				}
			},
			"Gather Coverage Node-05" : {
				node('node-05'){
					report_coverage('05')
				}
			}
		)
	}

	stage ('Submit Coverage') {
		node('master-01'){
			try {
				sh '''
				cd /var/lib/jenkins/coverage/
				unzip coverage-func-node-01.zip -d node-01
				unzip coverage-func-node-02.zip -d node-02
				unzip coverage-func-node-03.zip -d node-03
				unzip coverage-func-node-04.zip -d node-04
				bash merge_lcov.sh . merged-lcov.info
				cp merged-lcov.info $WORKSPACE/merged-lcov.info
				cp .coveralls.yml $WORKSPACE/.coveralls.yml
				cd $WORKSPACE
				cat merged-lcov.info | coveralls -v
				'''
			} catch (err) {
				echo "Error: ${err}"
				currentBuild.result = 'FAILURE'
				report()
				error('Stopping build: submitting coverage failed')
			}
		}
	}

	stage ('Cleanup') {
		parallel(
			"Cleanup Node-01" : {
				node('node-01'){
					cleanup()
				}
			},
			"Cleanup Node-02" : {
				node('node-02'){
					cleanup()
				}
			},
			"Cleanup Node-03" : {
				node('node-03'){
					cleanup()
				}
			},
			"Cleanup Node-04" : {
				node('node-04'){
					cleanup()
				}
			},
			"Cleanup Node-05" : {
				node('node-05'){
					cleanup()
				}
			},
			"Cleanup Master" : {
				node('master-01'){
					cleanup_master()
				}
			}
		)
	}

	stage ('Set milestone') {
		node('master-01'){
			milestone 1
			currentBuild.result = 'SUCCESS'
			report()
		}
	}
}
