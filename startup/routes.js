const express = require('express');
const users = require('../routes/users');
const auth = require('../routes/auth');
const wordLists = require('../routes/wordLists');
const words = require('../routes/words');
const favoriteWordLists = require('../routes/favoriteWordLists');
const error = require('../middlewares/error');
var bodyParser = require('body-parser');

module.exports = function(app){
    app.use(express.json());
    app.use(express.urlencoded({extended: false}));
    //app.use(bodyParser.urlencoded({ extended: false }));
    app.use('/api/auth', auth);
    app.use('/api/users', users);
    app.use('/api/wordLists', wordLists);
    app.use('/api/words', words);
    app.use('/api/favoriteWordLists', favoriteWordLists);
    app.use(error);
}