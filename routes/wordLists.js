const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { WordList, validate } = require('../models/wordList');
const { Word } = require('../models/word');
const { FavoriteWordList } = require('../models/favoriteWordList')
const { ONLY_ME, EVERYONE, USER_WITH_PASSWORD } = require('../models/wordList').enum;
const validateObjectId = require('../middlewares/validateObjectId');
const _ = require('lodash');
const Joi = require('joi');
const winston = require('winston');
const config = require('config');
require('express-async-errors');

//constant
const PAGE = 1;
const LIMIT = 50;

async function haveAccessToGetToken(wordList, req, res) {
    let haveAccess = false;
    if (wordList.user == req.user._id) haveAccess = true;
    else if (wordList.visible == EVERYONE) haveAccess = true;
    else if (wordList.visible == USER_WITH_PASSWORD){
        // validate password
        const {error} = validatePassword(req.body);
        if(error) return res.status(400).json({error: error.details[0].message});
        haveAccess = await wordList.validPassword(req.body.password);
    }        
    return haveAccess;
}

function validatePassword(wordListPassword) {
    const schema = {
      password: Joi.string().min(5).max(255).required()
    }
    return Joi.validate(wordListPassword, schema);
}

function validateQueryString(query) {
    const schema = {
        page: Joi.number().min(1),
        limit: Joi.number().min(1).max(100),
        createBy: Joi.string().valid([EVERYONE, ONLY_ME])
    }
    return Joi.validate(query, schema);
}

async function deleteManyWordFromManyWordList(wordLists){
    try{
        await Word.deleteMany({
            wordList: {$in: wordLists}
        });
    }
    catch(ex) {
        winston.error(ex.message, ex);
    }
}

async function deleteManyFavoriteWordListFromManyWordList(wordLists){
    try{
        await FavoriteWordList({
            wordList: {$in: wordLists}
        });
    }
    catch(ex) {
        winston.error(ex.message, ex);
    };
}

async function deleteManyWordFromOneWordList(wordListId) {
    try{
        await Word.deleteMany({
            wordList: wordListId
        });
    }
    catch(ex){
        winston.error(ex.message, ex);
    }
}

async function deleteManyFavoriteWordListFromOneWordList(wordListId) {
    try{
        await FavoriteWordList.deleteMany({
            wordList: wordListId
        });
    }
    catch(ex){
        winston.error(ex.message, ex);
    }
}

async function updateWordList(wordList, req) {
    wordList.title = req.body.title;
    if (req.body.visible) wordList.visible = req.body.visible;
    if (req.body.addWordBy) wordList.addWordBy = req.body.addWordBy;
    if (req.body.password) {
        const validPassword = await wordList.validPassword(req.body.password);
        if (!validPassword) {
            wordList.password = req.body.password;
            wordList.passwordChangeDate = Date.now();
            await wordList.calculateHash();
        }
    }
    await wordList.save();
}

function createPreviousLink(count, skip, limit, page, createBy){
    return (skip >=1 && (skip + limit) <= count)?
        'http://' + config.get('server.hostname') + ':' + config.get('server.port') +
        `/api/wordLists?createBy=${createBy}&page=${page-1}&limit=${limit}` : undefined;
}

function createNextLink(count, skip, limit, page, createBy){
    return (count > (skip + limit))?
        'http://' + config.get('server.hostname') + ':' + config.get('server.port') +
        `/api/wordLists?createBy=${createBy}&page=${(page+1)}&limit=${limit}` : undefined;
}

router.get('/', auth, async(req, res)=>{
    // validate querystirng
    const {error} = validateQueryString(req.query);
    if(error) return res.status(400).json({error: error.details[0].message});

    const condition = {}
    let createBy = EVERYONE;
    if(req.query.createBy !== EVERYONE){
        condition.user = req.user._id;
        createBy = ONLY_ME;
    }

    const limit = Number(req.query.limit) || LIMIT;
    const page = Number(req.query.page) || PAGE;
    const skip =  (page - 1) * limit;
    
    // get all wordLists
    const wordLists = await WordList.find(condition)
    .limit(limit)
    .skip(skip)
    .sort('-dateCreate')
    .populate({
        path: 'favoriteWordList',
        match: {user: req.user._id}
    })
    .select('-__v -password -id');

    const wordListsCount = await WordList.find(condition).countDocuments();

    // send wordList to client
    res.json({
        result: wordLists,
        previousLink: createPreviousLink(wordListsCount, skip, limit, page, createBy),
        nextLink: createNextLink(wordListsCount, skip, limit, page, createBy)
    });
});

router.post('/', auth, async (req, res)=>{
   // validate wordList
   const {error} = validate(req.body);
   if(error) return res.status(400).json({error: error.details[0].message});

   // create wordList
   let wordList = _.pick(req.body, ['title', 'visible', 'addWordBy', 'password']);
   wordList.user = req.user._id;
   wordList = new WordList(wordList);
   if (req.body.password) await wordList.calculateHash();
   await wordList.save();

   // send wordList to client
   res.json({result: _.pick(wordList, ['_id', 'title', 'visible', 'addWordBy', 'user', 'dateCreate'])});
});

router.delete('/', auth, async(req, res)=>{
    // find the all wordList(_id) for this user
    let wordLists = await WordList.find({
        user: req.user._id
    }).select('_id');
    
    wordLists = wordLists.map(wordList => wordList._id);

    if(wordLists){
        deleteManyWordFromManyWordList(wordLists);
        deleteManyFavoriteWordListFromManyWordList(wordLists);
        // delete all wordList
        await WordList.deleteMany({
            _id: {$in: wordLists}
        });
    }

    // send result to client
    res.json({result: 'All wordList deleted.'});
});

router.get('/:id', [auth, validateObjectId], async (req, res)=>{
    //find the wordList with this given id
    const wordList = await WordList.findOne({
        _id: req.params.id
    }).populate({
        path: 'favoriteWordList',
        match: {user: req.user._id}
    });

    if(!wordList) return res.status(404).json({error: 'The wordList with this given id not found.'});

    // send wordList to client
    res.json({result: _.pick(wordList, ['_id', 'title', 'visible', 'favoriteWordList', 'addWordBy', 'user', 'dateCreate'])});
});

router.put('/:id', [auth, validateObjectId], async(req, res)=>{
    // validate wordList
    const {error} = validate(req.body);
    if(error) return res.status(400).json({error: error.details[0].message});

    // find the wordList with this given id from client
    let wordList = await WordList.findOne({
        _id: req.params.id,
        user: req.user._id
    });
    if(!wordList) return res.status(404).json({error: 'The wordList with this given id not found.'});

    // update new wordList
    await updateWordList(wordList, req);

    // send new wordList to client
    res.json({result: _.pick(wordList, ['_id', 'title', 'visible', 'addWordBy', 'user', 'dateCreate'])});
});

router.delete('/:id', [auth, validateObjectId], async(req, res)=>{
    // find and remove the wordList with this given id
    const wordList = await WordList.findOneAndRemove({
        _id: req.params.id,
        user: req.user._id
    });
    if(!wordList) return res.status(404).json({error: 'The wordList with this given id not found.'});

    // remove all word in the wordList
    deleteManyWordFromOneWordList(req.params.id);
    // remove all favoriteWordList from this wordList
    deleteManyFavoriteWordListFromOneWordList(req.params.id);

    res.json({result: _.pick(wordList, ['_id', 'title', 'visible', 'addWordBy', 'user', 'dateCreate'])});
});

router.post('/token/:id', [auth, validateObjectId], async(req, res)=>{
    // find the wordList with this given id
    const wordList = await WordList.findById(req.params.id);
    if(!wordList) return res.status(404).json({error: "the wordList with this given id not founded."});
    
    const haveAccess = await haveAccessToGetToken(wordList, req, res);
    if(!haveAccess) return res.status(403).json({
        error: "You don't access to get token of this wordList"
    });

    // generate word access token
    const wordAccessToken = wordList.generateWordAccessToken(req.user._id);

    // send word access token to client
    res.setHeader('word-access-token', wordAccessToken);
    res.json({result: wordAccessToken});
});

module.exports = router;