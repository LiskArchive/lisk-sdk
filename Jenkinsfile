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
		stage('Run vulnerabilities check') {
			steps {
				withCredentials([string(credentialsId: 'liskhq-snyk-token', variable: 'SNYK_TOKEN')]) {
					sh 'snyk test'
				}
			}
		}
	}
}
