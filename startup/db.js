const mongoose = require('mongoose');
const config = require('config');
const winston = require('winston');

module.exports = async function(){
    try{
        await mongoose.connect(config.get('mongodb.address'), { useNewUrlParser: true });
        winston.info(`connected to mongodb on ${config.get('mongodb.address')}`);
    }
    catch(ex) {
        throw ex;
    }
}