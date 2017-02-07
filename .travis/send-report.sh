#!/bin/bash

TRAVIS_BUILD_NUMBER=$1
JOB_NUMBER=$2
TESTS_COUNT=$3
TEST_TYPE=$4
TRAVIS_BUILD_DIR=$5
TRAVIS_BRANCH=$6
TRAVIS_PULL_REQUEST_BRANCH=$7

echo "received args"
echo ${TRAVIS_BUILD_NUMBER} ${JOB_NUMBER} ${TESTS_COUNT} ${TEST_TYPE}

COVERAGE_DIR=${TRAVIS_BUILD_DIR}/test

if [ ${TEST_TYPE} == "FUNC" ]; then
  ZIP_REPORT_NAME=".coverage-func.zip";
else
  ZIP_REPORT_NAME=".coverage-unit.zip";
  (cd ${COVERAGE_DIR} && zip -r .coverage-unit) > ${COVERAGE_DIR}/${ZIP_REPORT_NAME}
fi

if [ ! -e ${COVERAGE_DIR}/${ZIP_REPORT_NAME} ]; then
  echo "Cannot find the report at path $COVERAGE_DIR/$ZIP_REPORT_NAME";
  bash .travis/report-failure.sh ${TRAVIS_BUILD_NUMBER}
  exit 1
fi

if [ -n ${TRAVIS_PULL_REQUEST_BRANCH+x} ] && [ ${TRAVIS_PULL_REQUEST_BRANCH} != "" ]; then
    BRANCH=${TRAVIS_PULL_REQUEST_BRANCH}
else
    BRANCH=${TRAVIS_BRANCH}
fi

mv ${COVERAGE_DIR}/${ZIP_REPORT_NAME} ${TRAVIS_BUILD_DIR}/.travis
REPORT_NAME=BRANCH-${BRANCH}-BUILD-${TRAVIS_BUILD_NUMBER}-JOB-${JOB_NUMBER}-OF-${TESTS_COUNT}.zip
mv ${TRAVIS_BUILD_DIR}/.travis/${ZIP_REPORT_NAME} ${TRAVIS_BUILD_DIR}/.travis/${REPORT_NAME}

scp ${TRAVIS_BUILD_DIR}/.travis/${REPORT_NAME} root@139.59.214.29:~/coverage-merger/lisk/coverages
rm ${TRAVIS_BUILD_DIR}/.travis/${REPORT_NAME}

echo ${TRAVIS_BUILD_DIR}/.travis/${REPORT_NAME} "SEND TO SERVER: pinkiepie.todr.me"
