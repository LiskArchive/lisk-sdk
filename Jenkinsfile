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
def initializeNode() {
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

def buildDependencies() {
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

def cleanUp() {
	try {
		sh 'pkill -f app.js -9'
	} catch (err) {
		echo "Error: ${err}"
		currentBuild.result = 'FAILURE'
		report()
		error('Stopping build: clean up failed')
	}
}

def cleanUpMaster() {
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
		error('Stopping build: master clean up failed')
	}
}

def archiveLogs() {
	sh '''
	mv "${WORKSPACE%@*}/logs" "${WORKSPACE}/logs_${NODE_NAME}_${JOB_BASE_NAME}_${BUILD_ID}"
	'''
	archiveArtifacts "logs_${NODE_NAME}_${JOB_BASE_NAME}_${BUILD_ID}/*"
}

def runAction(action) {
	try {
		if (action == 'lint') {
			sh """
			cd "\$(echo ${env.WORKSPACE} | cut -f 1 -d '@')"
			npm run ${action}
			"""
		} else {
			sh """
			cd "\$(echo ${env.WORKSPACE} | cut -f 1 -d '@')"
			npm test -- ${action}
			"""
		}
	} catch (err) {
		archiveLogs()
		echo "Error: ${err}"
		currentBuild.result = 'FAILURE'
		report()
		error('Stopping build: ' + action + ' failed')
	}
}

def reportCoverage(node) {
	try {
		sh """
		export HOST=127.0.0.1:4000
		# Gathers tests into single lcov.info
		npm run cover:report
		npm run cover:fetch
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

def report() {
	if (currentBuild.result == 'FAILURE') {
		def prBranch = ''
		if (env.CHANGE_BRANCH != null) {
			prBranch = " (${env.CHANGE_BRANCH})"
		}
		slackSend color: 'danger', message: "Build #${env.BUILD_NUMBER} of <${env.BUILD_URL}|${env.JOB_NAME}>${prBranch} failed (<${env.BUILD_URL}/console|console>, <${env.BUILD_URL}/changes|changes>)", channel: '#lisk-core-jenkins'
	}
}

lock(resource: "Lisk-Core-Nodes", inversePrecedence: true) {

	properties([
		parameters([
			string(name: 'JENKINS_PROFILE', defaultValue: 'jenkins', description: 'To build cache dependencies and run slow tests, change this value to jenkins-extensive.', )
		 ])
	])

	stage('Prepare workspace') {
		parallel(
			"Build cached dependencies" : {
				node('master-01') {
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
			"Initialize node-01" : {
				node('node-01') {
					initializeNode()
				}
			},
			"Initialize node-02" : {
				node('node-02') {
					initializeNode()
				}
			},
			"Initialize node-03" : {
				node('node-03') {
					initializeNode()
				}
			},
			"Initialize node-04" : {
				node('node-04') {
					initializeNode()
				}
			},
			"Initialize node-05" : {
				node('node-05') {
					initializeNode()
				}
			},
			"Initialize master workspace" : {
				node('master-01') {
					cleanUpMaster()
				}
			}
		)
	}

	stage('Build dependencies') {
		parallel(
			"Build dependencies node-01" : {
				node('node-01') {
					buildDependencies()
				}
			},
			"Build dependencies node-02" : {
				node('node-02') {
					buildDependencies()
				}
			},
			"Build dependencies node-03" : {
				node('node-03') {
					buildDependencies()
				}
			},
			"Build dependencies node-04" : {
				node('node-04') {
					buildDependencies()
				}
			},
			"Build dependencies node-05" : {
				node('node-05') {
					buildDependencies()
				}
			}
		)
	}

	stage('Start Lisk') {
		parallel(
			"Start Lisk node-01" : {
				node('node-01') {
					startLisk()
				}
			},
			"Start Lisk node-02" : {
				node('node-02') {
					startLisk()
				}
			},
			"Start Lisk node-03" : {
				node('node-03') {
					startLisk()
				}
			},
			"Start Lisk node-04" : {
				node('node-04') {
					startLisk()
				}
			},
			"Start Lisk node-05" : {
				node('node-05') {
					startLisk()
				}
			}
		)
	}

	stage('Run parallel tests') {
		timestamps {
			parallel(
				"Lint" : {
					node('node-01') {
						runAction('lint')
					}
				},
				"Functional HTTP GET tests" : {
					node('node-01') {
						if (params.JENKINS_PROFILE == 'jenkins-extensive') {
							runAction('mocha:extensive:functional:get')
						} else {
							runAction('mocha:untagged:functional:get')
						}
						archiveLogs()
					}
				}, // End node-01 tests
				"Functional HTTP POST tests" : {
					node('node-02') {
						if (params.JENKINS_PROFILE == 'jenkins-extensive') {
							runAction('mocha:extensive:functional:post')
						} else {
							runAction('mocha:untagged:functional:post')
						}
						archiveLogs()
					}
				}, // End node-02 tests
				"Functional WS tests" : {
					node('node-03') {
						if (params.JENKINS_PROFILE == 'jenkins-extensive') {
							runAction('mocha:extensive:functional:ws')
						} else {
							runAction('mocha:untagged:functional:ws')
						}
						archiveLogs()
					}
				}, // End node-03 tests
				"Unit tests" : {
					node('node-04') {
						if (params.JENKINS_PROFILE == 'jenkins-extensive') {
							runAction('mocha:extensive:unit')
						} else {
							runAction('mocha:untagged:unit')
						}
						archiveLogs()
					}
				}, // End node-04 tests
				"Functional system tests" : {
					node('node-05') {
						if (params.JENKINS_PROFILE == 'jenkins-extensive') {
							runAction('mocha:extensive:functional:system')
						} else {
							runAction('mocha:untagged:functional:system')
						}
						archiveLogs()
					}
				} // End node-05 tests
			) // End parallel
		} // End timestamp
	}

	stage('Gather coverage') {
		parallel(
			"Gather coverage node-01" : {
				node('node-01') {
					reportCoverage('01')
				}
			},
			"Gather coverage node-02" : {
				node('node-02') {
					reportCoverage('02')
				}
			},
			"Gather coverage node-03" : {
				node('node-03') {
					reportCoverage('03')
				}
			},
			"Gather coverage node-04" : {
				node('node-04') {
					reportCoverage('04')
				}
			},
			"Gather coverage node-05" : {
				node('node-05') {
					reportCoverage('05')
				}
			}
		)
	}

	stage('Submit coverage') {
		node('master-01') {
			try {
				sh '''
				cd /var/lib/jenkins/coverage/
				unzip coverage-func-node-01.zip -d node-01
				unzip coverage-func-node-02.zip -d node-02
				unzip coverage-func-node-03.zip -d node-03
				unzip coverage-func-node-04.zip -d node-04
				unzip coverage-func-node-05.zip -d node-05
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

	stage('Clean up') {
		parallel(
			"Clean up node-01" : {
				node('node-01') {
					cleanUp()
				}
			},
			"Clean up node-02" : {
				node('node-02') {
					cleanUp()
				}
			},
			"Clean up node-03" : {
				node('node-03') {
					cleanUp()
				}
			},
			"Clean up node-04" : {
				node('node-04') {
					cleanUp()
				}
			},
			"Clean up node-05" : {
				node('node-05') {
					cleanUp()
				}
			},
			"Clean up master" : {
				node('master-01') {
					cleanUpMaster()
				}
			}
		)
	}

	stage('Set milestone') {
		node('master-01') {
			milestone 1
			currentBuild.result = 'SUCCESS'
			report()
		}
	}
}
