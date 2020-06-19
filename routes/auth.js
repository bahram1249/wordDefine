const { User } = require('../models/user');
const Joi = require('joi');
const express = require('express');
const router = express.Router();
require('express-async-errors');

router.post('/', async(req, res)=>{
    // validate login fields
    const { error } = validate(req.body);
    if(error) return res.status(400).json({error: error.details[0].message});

    // find the user with this given email
    const user = await User.findOne({email: req.body.email});
    if(!user) return res.status(400).json({error: 'Invalid Email or Password'});

    // check if the password is true
    const validPassword = await user.validPassword(req.body.password);
    if(!validPassword) return res.status(400)
                                    .json({error: 'Invalid Email or Password'});

    // if every thing is ok send the authentication
    const token = user.generateAuthToken();

    res.header('x-auth-token', token).json({
        result: {
            token,
            userId: user.id
        }
    });
});

function validate(user){

    const schema = {
        email: Joi.string().regex(/^[a-zA-Z0-9_%+.-]+@[a-zA-Z0-9_.-]+[.][a-z-A-Z]{2,}$/).required(),
        password: Joi.string().min(6).max(256).required()
    }

    return Joi.validate(user, schema);
}

module.exports = router;