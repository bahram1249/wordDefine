const jwt = require('jsonwebtoken');
const config = require('config');
const {WordList} = require('../models/wordList');
const {USER_WITH_PASSWORD, ONLY_ME} = require("../models/wordList").enum

const INVALID_WORD_ACCESS_TOKEN = 'Invalid Word Access Token'


module.exports = async function(req, res, next){

    const token = req.header('word-access-token');
    if(!token) return res.status(401).json({error: 'Access denied. No word access token provided.'});

    try{
        const decoded = jwt.verify(token, config.get('jsonWebToken.wordAccessToken'));
        req.wordList = decoded.wordList;

        // if the access word token not for this user
        if (req.user._id !== decoded.user) throw INVALID_WORD_ACCESS_TOKEN;

        // if the password of wordList changed the all token before change password is not accessable
        const wordList = await WordList.findById(req.wordList);
        if(!wordList) return res.status(404).json({error: 'This wordList not exist anymore.'});
        if(wordList.visible == USER_WITH_PASSWORD &&
            wordList.passwordChangeDate >= new Date(decoded.iat*1000)) throw INVALID_WORD_ACCESS_TOKEN;
        
        // if wordList owner changed visible to only me the user of decoded token should be same
        if(wordList.visible == ONLY_ME && 
            wordList.user !== decoded.user) throw INVALID_WORD_ACCESS_TOKEN;
        next();
    }
    catch(e){
        return res.status(400).json({ error: INVALID_WORD_ACCESS_TOKEN });
    }
    
} 