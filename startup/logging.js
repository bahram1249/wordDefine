const winston = require('winston');
module.exports = function(){

    winston.exceptions.handle(
        new winston.transports.File({ filename: 'uncaughtExceptions.log' })
    );

    winston.add(new winston.transports.Console({
        colorize: true,
        prettyPrint: true,
        handleExceptions: true
     }));

    
    process.on('unhandledRejection', (ex)=>{
        throw ex;
    });
    
}