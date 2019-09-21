const {validate} = require('../../../models/favoriteWordList')
const mongoose = require('mongoose')


describe('favoriteWordList Models => validateFavoriteWordList', () => {

    it('Should be pass if data passed correct', async() => { 
        const favoriteWordList = {
            wordList: mongoose.Types.ObjectId().toHexString(),
        }

        const { error } = validate(favoriteWordList);
        expect(error).toBeFalsy();
    });

    it('Should be error if wordList not passed', async() => {
        const favoriteWordList = {
        }

        const {error} = validate(favoriteWordList);
        expect(error).toBeDefined();
    });


    it('Should be error if wordList is not a mongoose objectId', async() => {
        const favoriteWordList = {
            wordList: 'wrong objectId'
        }

        const {error} = validate(favoriteWordList);
        expect(error).toBeDefined();
    });
})