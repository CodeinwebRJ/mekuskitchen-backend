const fs = require('fs');

module.exports = {
  privateKey: fs.readFileSync('./keys/', 'utf8'),
};