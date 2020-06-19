const express = require('express');
const router = express.Router();
const { User, validate } = require('../models/user');
const auth = require('../middlewares/auth');
const validateObjectId = require('../middlewares/validateObjectId');
const upload = require('../middlewares/upload');
const _ = require('lodash');
const fs = require('fs');
const imageThumbnail = require('image-thumbnail');
require('express-async-errors');

router.post('/', async (req, res)=>{
    // validate user
    const { error } = validate(req.body);
    if(error) return res.status(400).json({error: error.details[0].message});

    // looking if email existed before
    let user = await User.findOne({ email: req.body.email });
    if (user) return res.status(400).json({error: 'User already registered.'});

    // create user
    user = new User(_.pick(req.body, ['name', 'email', 'password']));
    await user.calculateHash();
    await user.save();

    // send responce to user
    const token = user.generateAuthToken();
    res.header('x-auth-token', token).json({
        result: _.pick(user, ['_id', 'name', 'email', 'dateCreate'])
    });
});


router.post('/profilePhoto', [auth, upload.single('avatar')], async(req, res)=>{

    if(!req.file) return res.status(400).json({error: "please send a picture"});

    if(!(req.file.mimetype == 'image/jpeg' || req.file.mimetype == 'image/png'))
        return res.status(400).json({error: "please send a picture with *.jpg,*.png format."});

    // options to create thumbnail
    const options = {
        width: 100,
        height: 100,
        jpegOptions: {
            force:true,
            quality:90
        }
    }

    const thumbnail = await imageThumbnail(req.file.path, options);
    
    await fs.writeFile(req.file.path + '.jpg', thumbnail, (err)=> {
        if(err) res.status(500).send({error: "something failed."})
    });

    // set new profile photo
    let user = await User.findOne({
        _id: req.user._id
    });

    // send new profile photo
    user.profilePhoto = {
        contentType: req.file.mimetype,
        path: req.file.path
    }

    await user.save();

    res.json({result: "Your Profile Photo Updated."})
});

router.get('/:id/profilePhoto', [auth, validateObjectId], async(req, res)=>{

    const user = await User.findOne({_id: req.params.id});
    
    if(!user.profilePhoto) {
        const img = fs.readFileSync('uploads/avatar');
        const encodeImage = img.toString('base64');
        const data = new Buffer(encodeImage, 'base64');
        res.contentType("image/jpeg");
        return res.send(data)
    }

    const img = fs.readFileSync(user.profilePhoto.path);
    const encodeImage = img.toString('base64');
    const data = new Buffer(encodeImage, 'base64');

    res.contentType(user.profilePhoto.contentType);
    res.send(data);
});

router.get('/:id/profilePhoto/thumb', [auth, validateObjectId], async(req, res)=>{

    const user = await User.findOne({_id: req.params.id});
    
    if(!user.profilePhoto) {
        const img = fs.readFileSync('uploads/avatar');
        const encodeImage = img.toString('base64');
        const data = new Buffer(encodeImage, 'base64');
        res.contentType("image/jpeg");
        return res.send(data)
    }

    const img = fs.readFileSync(user.profilePhoto.path + '.jpg');
    const encodeImage = img.toString('base64');
    const data = new Buffer(encodeImage, 'base64');

    res.contentType('image/jpeg');
    res.send(data);
});

router.get('/me', auth, async (req, res)=>{
    // find the user
    const user = await User.findById(req.user._id);
    if(!user) return res.status(404).json({error: 'The user deleted or deactived.'});

    res.json({result: _.pick(user, ['_id', 'name', 'email', 'dateCreate'])});
});

module.exports = router;