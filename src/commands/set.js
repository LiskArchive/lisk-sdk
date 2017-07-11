const config = require('../../config.json');
const fse = require('fs-extra');

module.exports = function setCommand(vorpal) {
  function setJSON(value) {
    config.json = value;
    fse.writeFileSync('config.json', JSON.stringify(config, null, 2), 'utf8');
    return { message: `successfully set json output to ${value}` };
  }

  function setTestnet(value) {
    config.liskJS.testnet = (value === 'true');
    fse.writeFileSync('config.json', JSON.stringify(config, null, 2), 'utf8');
    return { message: `successfully set testnet to ${value}` };
  }

  vorpal
    .command('set <variable> <value>')
    .description('Set configuration <variable> to <value>')
    .action((userInput, callback) => {
      const getType = {
        json: setJSON,
        testnet: setTestnet,
      };

      const returnValue = getType[userInput.variable](userInput.value);

      return (callback && typeof callback === 'function') ? callback(returnValue.message) : returnValue.message;
    });
};
