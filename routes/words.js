const express = require('express');
const router = express.Router();
const { Word, validate } = require('../models/word');
const { WordList } = require('../models/wordList');
const { EVERYONE, USER_WITH_PASSWORD } = require('../models/wordList').enum;
const auth = require('../middlewares/auth');
const accessToSeenWord = require('../middlewares/accessToSeenWord');
const validateObjectId = require('../middlewares/validateObjectId');
const Joi = require('joi');
const _ = require('lodash');
require('express-async-errors');

const PAGE = 1;
const LIMIT = 50;

function validateQueryString(query){
    const schema = {
        page: Joi.number().min(1),
        limit: Joi.number().min(1).max(100)
    }
    return Joi.validate(query, schema);
}

async function accessToAddWord(wordList, req){
    if(wordList.user == req.user._id) return true;
    else if(wordList.addWordBy == EVERYONE) return true;
    else if (wordList.addWordBy == USER_WITH_PASSWORD){
        // validate password
        const {error} = validatePassword(req.body.password);
        if(error) return false;
        return await wordList.validPassword(req.body.password);
    }
    return false;
}

function accessToModifyWord(wordList, word, req){
    if(wordList.user == req.user._id) return true;
    else if(word.user == req.user._id) return true;
    return false;
}

async function updateWord(word, req) {
    word.name = req.body.name;

    if (req.body.definition) word.definition = req.body.definition;

    if(req.body.examples) word.examples = req.body.examples;

    if (req.body.lang) word.lang = req.body.lang;

    await word.save();
}

function validatePassword(wordListPassword){
    const password = Joi.string().min(6).max(255).required();
    return Joi.validate(wordListPassword, password);
}

function createPreviousLink(count, skip, limit, page){
    return (skip >=1 && (skip + limit) <= count)?
        `api/words?page=${page-1}&limit=${limit}` : undefined;
}

function createNextLink(count, skip, limit, page){
    return (count > (skip + limit))?
        `api/words?page=${(page+1)}&limit=${limit}` : undefined;
}

router.get('/', [auth, accessToSeenWord], async(req, res)=>{
    // validate querystirng
    const {error} = validateQueryString(req.query);
    if(error) return res.status(400).json({error: error.details[0].message});

    const limit = Number(req.query.limit) || LIMIT;
    const page = ((Number(req.query.page) || PAGE));
    const skip =  (page - 1) * limit;

    // find all word in this wordList (accessToSeenWord)
    const words = await Word.find({
        wordList: req.wordList
    })
    .limit(limit)
    .skip(skip)
    .sort('-dateCreate')
    .populate({
        path: 'user',
        select: '_id name'
    })
    .select('-__v');

    const wordsCount = await Word.find({
        wordList: req.wordList
    }).countDocuments();

    res.json({
        result: words,
        previousLink: createPreviousLink(wordsCount, skip, limit, page),
        nextLink: createNextLink(wordsCount, skip, limit, page)
    })
});

router.post('/', auth, async(req, res)=>{
    // validate word
    const {error} = validate(req.body);
    if(error) return res.status(400).json({error: error.details[0].message});

    // valid or invalid wordList
    const wordList = await WordList.findById(req.body.wordList);
    if(!wordList) return res.status(400).json({error: 'Invalid wordList'});

    // is this user have access for adding a word in the wordList or not
    const haveAccess = await accessToAddWord(wordList, req);
    if(!haveAccess) return res.status(403).json({
        error: "You don't access to add word in this wordList"
    });

    // adding a word in database
    let word = _.pick(req.body,
        ['name', 'definition', 'examples', 'lang', 'wordList']);
    word.user = req.user._id;
    word = new Word(word);
    await word.save();

    // send word to client
    res.json({
        result: _.pick(word,
            ['_id', 'name', 'definition', 'examples', 'lang',
            'dateCreate', 'wordList', 'user']
            )
    });
});

router.get('/:id', [auth, validateObjectId, accessToSeenWord], async(req, res)=>{
    
    const word = await Word.findById(req.params.id).populate({
        path: 'user',
        select: '_id name'
    });

    if(!word) return res.status(404)
                        .json({error: "The word with this given id not found."});

    res.json({
        result: _.pick(word,
            ['_id', 'name', 'definition', 'examples', 'lang',
            'dateCreate', 'wordList', 'user']
            )
    });
});

router.put('/:id', [auth, validateObjectId], async(req, res)=>{
    // validate word
    const {error} = validate(req.body);
    if(error) return res.status(400).json({error: error.details[0].message});

    // find the word that client want to update
    let word = await Word.findOne({
        _id: req.params.id
    });
    if(!word) return res.status(404)
                    .json({error: "The word with this given id not founded!"});

    // valid or invalid wordList
    const wordList = await WordList.findById(req.body.wordList);
    if(!wordList) return res.status(400).json({error: 'Invalid wordList'});

    if(word.wordList != wordList._id.toHexString()) return res.status(400).json({
        error: 'The old wordList and new wordList should be same'
    });

    // is this user have access for updating this word or not?
    // owner the wordList or owner the word can update this word
    const haveAccess = accessToModifyWord(wordList, word, req);
    if(!haveAccess) return res.status(403).json({
        error: "You don't access to update word in this wordList"
    });

    // update word
    await updateWord(word, req);

    res.json({
        result: _.pick(word,
            ['_id', 'name', 'definition', 'examples','lang',
            'wordList', 'user', 'dateCreate']
            )
    });
});

router.delete('/:id', [auth, validateObjectId], async(req, res)=>{
    // find word with this id params
    let word = await Word.findOne({
        _id: req.params.id
    });
    if(!word) return res.status(404)
                    .json({error: 'The word with this given id not founded.'});

    // find the wordList of this word
    const wordList = await WordList.findById(word.wordList);
    if(!wordList) return res.status(404)
                    .json({error: 'The word with this given id not founded.'});

    // is this user have access to delete this word or not ?
    // owner the wordList or owner the word can delete this word
    const haveAccess = accessToModifyWord(wordList, word, req);
    if(!haveAccess) return res.status(403)
                        .json({error: "You don't access to delete this word"});

    word = await word.remove();

    res.json({
        result: _.pick(word,
            ['_id', 'name', 'definition', 'examples', 'lang',
            'wordList', 'user', 'dateCreate'])
    });
});

module.exports = router;