pipeline {
	agent { node { label 'lisky' } }
	stages {
		stage('Prepare workspace') {
			steps {
				deleteDir()
				checkout scm
			}
		}
		stage('Install dependencies') {
			steps {
				sh 'npm install --verbose'
			}
		}
		stage('Run lint') {
			steps {
				sh 'npm run lint'
			}
		}
		stage('Run tests') {
			steps {
				sh 'LISKY_CONFIG_DIR=$WORKSPACE/.lisky npm run test'
				sh '''
				cp ~/.coveralls.yml-lisky .coveralls.yml
				npm run cover
				'''
			}
		}
	}
	post {
		success {
			githubNotify context: 'continuous-integration/jenkins/lisky', description: 'The build passed.', status: 'SUCCESS'
		}
		failure {
			githubNotify context: 'continuous-integration/jenkins/lisky', description: 'The build failed.', status: 'FAILURE'
		}
		aborted {
			githubNotify context: 'continuous-integration/jenkins/lisky', description: 'The build was aborted.', status: 'ERROR'
		}
		always {
			sh 'rm -f $WORKSPACE/.lisky/config.lock'
		}
	}
}
