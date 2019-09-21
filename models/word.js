const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const languages = [
    'af','ar','az','be','bg','ca','cs','cy','da','de','dv','el',
    'en','eo','es','et','eu','fa','fi','fo','fr','gl','gu','he',
    'hi','hr','hu','hy','id','is','it','ja','ka','kk','kn','ko',
    'kok','ky','lt','lv','mi','mk','mn','mr','ms','mt','nb','nl',
    'ns','pa','pl','ps','pt','qu','ro','ru','sa','se','sk','sl',
    'sq','sv','sw','syr','ta','te','th','tl','tn','tr','tt','ts',
    'uk','ur','uz','vi','xh','zh','zu'
]

const wordSchema = new mongoose.Schema({
    name: {
        type: String,
        max: 255,
        require: true
    },
    definition: {
        type: String,
        min:2,
        max: 1024,
        default: 'unknown'
    },
    examples: {
        type: String,
        min:2,
        max: 2048
    },
    lang: {
        type: String,
        enum: languages,
        default: 'en'
    },
    dateCreate: {
        type: Date,
        default: Date.now
    },
    wordList: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'WordList',
        required: true
    },
    user: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
        required: true
    }
})

const Word = mongoose.model('Word', wordSchema);

function validateWord(word){
    const schema = {
        name: Joi.string().max(255).required(),
        definition: Joi.string().min(2).max(1024),
        examples: Joi.string().min(2).max(2048),
        lang: Joi.string().valid(languages),
        wordList: Joi.objectId().required(),
        password: Joi.string().min(3).max(255)
    }
    return Joi.validate(word, schema);
}

module.exports.Word = Word;
module.exports.languagesEnum = languages
module.exports.validate = validateWord;