@Library('lisk-jenkins') _
pipeline {
	agent { node { label 'lisk-commander' } }
	stages {
		stage('Install dependencies') {
			steps {
				sh 'npm install --verbose'
			}
		}
		stage('Run lint') {
			steps {
				ansiColor('xterm') {
					sh 'npm run lint'
				}
			}
		}
		stage('Build') {
			steps {
				sh 'npm run build'
			}
		}
		stage('Run tests') {
			steps {
				ansiColor('xterm') {
					sh 'LISK_COMMANDER_CONFIG_DIR=$WORKSPACE/.lisk-commander npm run test'
					sh '''
					cp ~/.coveralls.yml-lisk-commander .coveralls.yml
					npm run cover
					'''
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
