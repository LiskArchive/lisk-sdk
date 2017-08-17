/*
 * Copyright © 2017 Lisk Foundation
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
 *
 */
node('lisk-js-01'){
  lock(resource: "lisk-js-01", inversePrecedence: true) {
    stage ('Prepare Workspace') {
      deleteDir()
      checkout scm
    }

    stage ('Build Dependencies') {
      try {
        sh '''#!/bin/bash
        # Install Deps
        npm install --verbose
        cp ~/.coveralls.yml .
        '''
      } catch (err) {
        currentBuild.result = 'FAILURE'
        error('Stopping build, installation failed')
      }
    }

    stage ('Run Eslint') {
      try {
        sh '''#!/bin/bash
        # Run Tests
        grunt eslint-ci
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
        npm run jenkins
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
