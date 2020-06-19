const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('config');
const bcrypt = require('bcrypt');
const Joi = require('joi');

const profilePhotoSchema = new mongoose.Schema({
    path: String,
    contentType: String
});

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 255
    },
    email: {
        type: String,
        match: /^[a-zA-Z0-9_%+.-]+@[a-zA-Z0-9_.-]+[.][a-z-A-Z]{2,}$/,
        required: true,
        unique: true
    },
    // profilePhoto: {
    //     type: {
    //         contentType: String,
    //         data: Buffer
    //     },
    //     required: false
    // },
    profilePhoto: {
        type: profilePhotoSchema,
        required: false
    },
    password: {
        type: String,
        minlength: 6,
        maxlength: 1024,
        required: true
    },
    dateCreate: {
        type: Date,
        default: Date.now
    },
    passwordChangeDate: {
        type: Date,
        default: Date.now
    }
});

userSchema.methods.generateAuthToken = function(){
    const token = jwt.sign(
        {
         _id: this._id,
         name: this.name,
         email: this.email
        },
        config.get('jsonWebToken.privateKey')
    );
    return token;
}

userSchema.methods.calculateHash = async function(){
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
}

userSchema.methods.validPassword = async function(password){
    return await bcrypt.compare(password, this.password);
}

const User = mongoose.model('User', userSchema);

function validateUser(user){
    const schema = {
        name: Joi.string().min(3).max(255).required(),
        email: Joi.string().regex(/^[a-zA-Z0-9_%+.-]+@[a-zA-Z0-9_.-]+[.][a-z-A-Z]{2,}$/).required(),
        password: Joi.string().min(6).max(256).required()
    }
    return Joi.validate(user, schema);
}

module.exports.User = User;
module.exports.validate = validateUser;