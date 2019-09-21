const config = require('config');
const winston = require('winston');
const express = require('express');
const app = express();


require('./startup/logging')();
require('./startup/db')();
require('./startup/routes')(app);


const port = process.env.PORT || config.get('server.port');
const server = app.listen(port, ()=>{
    winston.info(`server run on ${config.get('server.hostname')}:${port}`);
});
module.exports = server;