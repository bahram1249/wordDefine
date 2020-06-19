const express = require('express');
const router = express.Router();
const { FavoriteWordList, validate } = require('../models/favoriteWordList');
const { WordList } = require('../models/wordList');
const auth = require('../middlewares/auth');
const validateObjectId = require('../middlewares/validateObjectId');
const _ = require('lodash');
const Joi = require('joi');

const PAGE = 1;
const LIMIT = 50;

function validateQueryString(query){
    const schema = {
        page: Joi.number().min(1),
        limit: Joi.number().min(1).max(100)
    }
    return Joi.validate(query, schema);
}

function createPreviousLink(count, skip, limit, page){
    return (skip >=1 && (skip + limit) <= count)?
        `api/favoriteWordLists?page=${page-1}&limit=${limit}` : undefined;
}

function createNextLink(count, skip, limit, page){
    return (count > (skip + limit))?
        `api/favoriteWordLists?page=${(page+1)}&limit=${limit}` : undefined;
}

router.get('/', auth, async(req, res)=>{
    // validate querystirng
    const {error} = validateQueryString(req.query);
    if(error) return res.status(400).json({error: error.details[0].message});

    const limit = Number(req.query.limit) || LIMIT;
    const page = Number(req.query.page) || PAGE;
    const skip =  (page - 1) * limit;

    // find all favoriteWordLists
    const favoriteWordLists = await FavoriteWordList.find({
        user: req.user._id
    })
    .populate({
        path: 'wordList',
        select: '_id title visible addWordBy user dateCreate',
        populate: {path: 'user', select: '_id name'}
    })
    .sort('-dateSubmitted')
    .limit(limit)
    .skip(skip)
    .select('-__v');

    const favoriteWordListCount = await FavoriteWordList.find({
        user: req.user._id
    }).countDocuments();
    
    res.json({
        result: favoriteWordLists,
        previousLink: createPreviousLink(favoriteWordListCount, skip, limit, page),
        nextLink: createNextLink(favoriteWordListCount, skip, limit, page)
    });
});

router.get('/:id', [auth , validateObjectId], async(req, res)=>{
    const favoriteWordList = await FavoriteWordList.findById(req.params.id)
               .populate({
                            path: 'wordList',
                            select: '_id title visible addWordBy user dateCreate',
                            populate: {path: 'user', select: '_id name'}
    });
    
    if(!favoriteWordList) return res.status(404).json({
        error: 'The favoriteWordList with this given id not founded.'
    });

    res.json({
        result: _.pick(favoriteWordList,
                        ['_id', 'wordList', 'user', 'dateSubmitted'])});
});

router.post('/', auth, async(req, res)=>{
    // validate favoriteWordList
    const { error } = validate(req.body);
    if(error) return res.status(400).json({error: error.details[0].message});

    // is wordList exist ?
    const wordList = await WordList.findById(req.body.wordList);
    if(!wordList) return res.status(400).json({error: 'Invalid wordList Id'});

    // is this wordList already on favorite?
    let favoriteWordList = await FavoriteWordList.findOne({
        wordList: req.body.wordList,
        user: req.user._id
    });
    if(favoriteWordList) return res.status(400)
                        .json({error: 'this favoriteWordList is already exist.'})

    // create favoriteWordList in db
    favoriteWordList = new FavoriteWordList({
        wordList: req.body.wordList,
        user: req.user._id
    });
    await favoriteWordList.save();

    res.json({
        result: _.pick(favoriteWordList,
                                ['_id', 'wordList', 'user', 'dateSubmitted'])});
});

router.delete('/', auth, async(req, res)=>{
    await FavoriteWordList.deleteMany({
        user: req.user._id
    });

    res.json({result: 'all favoriteWordLists deleted.'})
});

router.delete('/:id', [auth, validateObjectId], async(req, res)=>{
    const favoriteWordList = await FavoriteWordList.findOneAndDelete({
        user: req.user._id,
        _id: req.params.id
    });
    if(!favoriteWordList) return res.status(404).json({
        error: 'The favoriteWordList with this given id not founded.'
    });
    
    return res.json({
        result: _.pick(favoriteWordList,
                            ['_id', 'wordList', 'user', 'dateSubmitted'])});
});

module.exports = router;