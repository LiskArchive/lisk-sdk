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
		always {
			step([
				$class: 'GitHubCommitStatusSetter',
				errorHandlers: [[$class: 'ShallowAnyErrorHandler']],
				contextSource: [$class: 'ManuallyEnteredCommitContextSource', context: 'jenkins-ci/lisky'],
				statusResultSource: [
					$class: 'ConditionalStatusResultSource',
					results: [
							[$class: 'BetterThanOrEqualBuildResult', result: 'SUCCESS', state: 'SUCCESS', message: 'This commit looks good :)'],
							[$class: 'BetterThanOrEqualBuildResult', result: 'FAILURE', state: 'FAILURE', message: 'This commit failed testing :('],
							[$class: 'AnyBuildResult', state: 'FAILURE', message: 'This build some how escaped evaluation']
					]
				]
			])
		}
	}
}
