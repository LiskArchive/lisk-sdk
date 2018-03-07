def get_build_info() {
	pr_branch = ''
	if (env.CHANGE_BRANCH != null) {
		pr_branch = " (${env.CHANGE_BRANCH})"
	}
	build_info = "#${env.BUILD_NUMBER} of <${env.BUILD_URL}|${env.JOB_NAME}>${pr_branch}"
	return build_info
}

def slack_send(color, message) {
	/* Slack channel names are limited to 21 characters */
	CHANNEL_MAX_LEN = 21

	channel = "${env.JOB_NAME}".tokenize('/')[0]
	channel = channel.replace('lisk-', 'lisk-ci-')
	if ( channel.size() > CHANNEL_MAX_LEN ) {
		 channel = channel.substring(0, CHANNEL_MAX_LEN)
	}

	echo "[slack_send] channel: ${channel} "
	slackSend color: "${color}", message: "${message}", channel: "${channel}"
}

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
				build_info = get_build_info()
				slack_send('good', "Recovery: build ${build_info} was successful.")
			}
			githubNotify context: 'continuous-integration/jenkins/lisk-commander', description: 'The build passed.', status: 'SUCCESS'
			dir('node_modules') {
				deleteDir()
			}
		}
		failure {
			script {
				build_info = get_build_info()
				slack_send('danger', "Build ${build_info} failed (<${env.BUILD_URL}/console|console>, <${env.BUILD_URL}/changes|changes>)\n")
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
