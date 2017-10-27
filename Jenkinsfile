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
				sh '''
				npm install --verbose
				cp ~/.coveralls.yml-lisky .coveralls.yml
				'''
			}
		}
		stage('Run lint') {
			steps {
				sh 'npm run lint'
			}
		}
		stage('Run tests') {
			steps {
				sh 'npm run test'
			}
		}
	}
	post {
		success {
			githubNotify description: 'The build passed.', status: 'SUCCESS'
		}
		failure {
			githubNotify description: 'The build failed.', status: 'FAILURE'
		}
		aborted {
			githubNotify description: 'The build was aborted.', status: 'ERROR'
		}
	}
}
