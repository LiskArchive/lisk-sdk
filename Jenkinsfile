@Library('lisk-jenkins') _

pipeline {
	agent { node { label 'lisk-commander' } }
	stages {
		stage('Install dependencies') {
			steps {
				script {
					cache_file = restoreCache("package.json")
				}
				nvm(getNodejsVersion()) {
					sh 'npm install --verbose'
				}
				script {
					saveCache(cache_file, './node_modules', 10)
				}
			}
		}
		stage('Run lint') {
			steps {
				ansiColor('xterm') {
					nvm(getNodejsVersion()) {
						sh 'npm run lint'
					}
				}
			}
		}
		stage('Build') {
			steps {
				nvm(getNodejsVersion()) {
					sh 'npm run build'
				}
			}
		}
		stage('Run tests') {
			steps {
				ansiColor('xterm') {
					nvm(getNodejsVersion()) {
						sh 'LISK_COMMANDER_CONFIG_DIR=$WORKSPACE/.lisk-commander npm run test'
						withCredentials([string(credentialsId: 'lisk-commander-coveralls-token', variable: 'COVERALLS_REPO_TOKEN')]) {
							sh 'npm run cover'
						}
					}
				}
			}
		}
	}
	post {
		success {
			script {
				build_info = getBuildInfo()
				liskSlackSend('good', "Recovery: build ${build_info} was successful.")
			}
			githubNotify context: 'continuous-integration/jenkins/lisk-commander', description: 'The build passed.', status: 'SUCCESS'
			dir('node_modules') {
				deleteDir()
			}
		}
		failure {
			script {
				build_info = getBuildInfo()
				liskSlackSend('danger', "Build ${build_info} failed (<${env.BUILD_URL}/console|console>, <${env.BUILD_URL}/changes|changes>)\n")
			}
			githubNotify context: 'continuous-integration/jenkins/lisk-commander', description: 'The build failed.', status: 'FAILURE'
		}
		aborted {
			githubNotify context: 'continuous-integration/jenkins/lisk-commander', description: 'The build was aborted.', status: 'ERROR'
		}
		always {
			sh 'rm -f $WORKSPACE/.lisk-commander/config.lock'
		}
	}
}
