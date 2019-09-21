const mongoose = require('mongoose')
const Joi = require('joi')
Joi.objectId = require('joi-objectid')(Joi)

const favoriteWordListSchema = new mongoose.Schema({
    wordList: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'WordList',
        required: true
    },
    user: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
        required: true
    },
    dateSubmitted: {
        type: Date,
        default: Date.now
    }
})

const FavoriteWordList = mongoose.model('FavoriteWordList', favoriteWordListSchema);


function validateFavoriteWordList(favoriteWordList){
    const schema = {
        wordList: Joi.objectId().required()
    }
    return Joi.validate(favoriteWordList, schema);
}

module.exports.FavoriteWordList = FavoriteWordList;
module.exports.validate = validateFavoriteWordList;