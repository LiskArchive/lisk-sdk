var publicIp = require('public-ip');

publicIp.v4().then(ip => {
      console.log("your public ip address", ip);
});

