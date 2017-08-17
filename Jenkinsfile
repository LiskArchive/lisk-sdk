node('lisky-01'){
  lock(resource: "lisky-01", inversePrecedence: true) {
    stage ('Prepare Workspace') {
      deleteDir()
      checkout scm
    }

    stage ('Build Dependencies') {
      try {
        sh '''#!/bin/bash
        # Install Deps
        npm install --verbose
        cp ~/.coveralls.yml-lisky .coveralls.yml
        '''
      } catch (err) {
        currentBuild.result = 'FAILURE'
        error('Stopping build, installation failed')
      }
    }

    stage ('Run Eslint') {
      try {
        sh '''#!/bin/bash
        # Run Eslint
        grunt eslint
        '''
      } catch (err) {
        currentBuild.result = 'FAILURE'
        error('Stopping build, tests failed')
      }
    }

    stage ('Run tests') {
      try {
        sh '''#!/bin/bash
        # Run Tests
        npm run test
        '''
      } catch (err) {
        currentBuild.result = 'FAILURE'
        error('Stopping build, tests failed')
      }
    }

    stage ('Set milestone') {
      milestone 1
      deleteDir()
      currentBuild.result = 'SUCCESS'
    }
  }
}
