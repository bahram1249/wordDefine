const mongoose = require('mongoose');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const config = require('config');
const bcrypt = require('bcrypt');
Joi.objectId = require('joi-objectid')(Joi);

//define
const ONLY_ME = "onlyMe"
const EVERYONE = "everyone"
const USER_WITH_PASSWORD = "userWithPassword"

const wordListSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 255
    },
    dateCreate: {
        type: Date,
        default: Date.now
    },
    visible: {
        type: String,
        enum: [ONLY_ME, EVERYONE, USER_WITH_PASSWORD],
        default : EVERYONE
    },
    addWordBy: {
        type: String,
        enum: [ONLY_ME, EVERYONE, USER_WITH_PASSWORD],
        default: ONLY_ME
    },
    password: {
        type: String,
        minlength: 6,
        maxlength: 1024,
        default: '123456'
    },
    user: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
        required: true
    },
    passwordChangeDate: {
        type: Date,
        default: Date.now
    }
});

wordListSchema.methods.calculateHash = async function(){
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
}

wordListSchema.methods.validPassword = async function(password){
    return await bcrypt.compare(password, this.password);
}

wordListSchema.methods.generateWordAccessToken = function(userId){
    const token = jwt.sign(
        {
         user: userId,
         wordList: this._id
        },
        config.get('jsonWebToken.wordAccessToken')
    );
    return token;
}

const WordList = mongoose.model('WordList', wordListSchema);

function validateWordList(wordList){
    const schema = {
        title: Joi.string().min(3).max(255).required(),
        visible: Joi.string().valid(ONLY_ME, EVERYONE, USER_WITH_PASSWORD),
        addWordBy: Joi.string().valid(ONLY_ME, EVERYONE, USER_WITH_PASSWORD),
        password: Joi.string().min(3).max(255).when('visible', {
            is: USER_WITH_PASSWORD, then: Joi.string().min(3).max(255).required()
        }).concat(Joi.string().min(3).max(255).when('addWordBy', {
            is: USER_WITH_PASSWORD, then: Joi.string().min(3).max(255).required()
        }))
    }
    return Joi.validate(wordList, schema);
}

module.exports.enum = {
    ONLY_ME,
    EVERYONE,
    USER_WITH_PASSWORD
}
module.exports.WordList = WordList;
module.exports.validate = validateWordList;