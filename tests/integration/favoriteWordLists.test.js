const request = require('supertest');
const { FavoriteWordList } = require('../../models/favoriteWordList');
const { WordList } = require('../../models/wordList');
const { User } = require('../../models/user');
const mongoose = require('mongoose');

let server;
let title;
let user;
let token;

async function createWordList(){
    const wordList = new WordList({
        title,
        user: user._id
    });
    await wordList.save();
    return wordList;
}

async function createUser(){
    const user = new User({
        name: "test",
        email: 'test@gmail.com',
        password: '123456'
    });
    await user.save();
    return user;
}

describe('/api/favoriteWordLists', () => {
    beforeAll(async(done) => {
        server = require('../../app');
        user = await createUser();
        token = user.generateAuthToken();
        done();
    });

    beforeEach(async(done) => {
        title = 'test';
        done();
    });

    afterEach(async(done) => {
        await FavoriteWordList.deleteMany({});
        await WordList.deleteMany({});
        done();
    });

    afterAll(async(done) => {
        await User.deleteMany({});
        await server.close();
        done();
    });

    describe('GET /:id', () => {
        const exec = async(address)=>{
            return await request(server)
                .get(address)
                .set('x-auth-token', token)
                .send();
        }

        it('Should get specific favoriteWordLists', async () => {
            const wordList = await createWordList();

            const favoriteWordList = new FavoriteWordList({
                wordList: wordList._id,
                user: user._id
            });
            await favoriteWordList.save();

            const res = await exec(`/api/favoriteWordLists/${favoriteWordList._id}`);

            expect(res.status).toBe(200);
            expect(res.body.result).toBeTruthy();
            expect(res.body.result._id).toBe(favoriteWordList._id.toHexString());
            expect(res.body.result.wordList).toBe(wordList._id.toHexString());
            expect(res.body.result.user).toBe(user._id.toHexString());
        });
    });

    describe('GET /', () => {
        const exec = async(address)=>{
            return await request(server)
                .get(address)
                .set('x-auth-token', token)
                .send();
        }

        let favoriteWordLists;

        async function createFavoriteWordLists(){
            title = 'first wordList';
            const firstWordList = await createWordList();
            title = 'second wordList';
            const secondWordList = await createWordList();

            const favoriteWordLists = [
                {
                    wordList: firstWordList._id,
                    user: user._id
                },
                {
                    wordList: secondWordList._id,
                    user: user._id
                }
            ]
            await FavoriteWordList.insertMany(favoriteWordLists);
            return favoriteWordLists;
        }

        beforeEach(async(done)=>{
            favoriteWordLists = await createFavoriteWordLists();
            done();
        });

        afterEach(async(done)=>{
            await FavoriteWordList.deleteMany({});
            done();
        });

        it('Should return all favoriteWordLists', async () => {
            const res = await exec('/api/favoriteWordLists')

            expect(res.status).toBe(200);
            expect(res.body.result).toBeTruthy();
            expect(res.body.result.length).toBe(favoriteWordLists.length);
            expect(res.body.nextLink).toBeFalsy();
            expect(res.body.previousLink).toBeFalsy();
        });

        it('Should return 1 favoriteWordList with limit 1', async () => {
            const res = await exec('/api/favoriteWordLists?limit=1')

            expect(res.status).toBe(200);
            expect(res.body.result).toBeTruthy();
            expect(res.body.result.length).toBe(1);
            expect(res.body.nextLink).toBeTruthy();
            expect(res.body.previousLink).toBeFalsy();
        });

        it('Should return 1 favoriteWordList with limit 1 in page 2', async () => {
            const res = await exec('/api/favoriteWordLists?limit=1&page=2')

            expect(res.status).toBe(200);
            expect(res.body.result).toBeTruthy();
            expect(res.body.result.length).toBe(1);
            expect(res.body.nextLink).toBeFalsy();
            expect(res.body.previousLink).toBeTruthy();
        });
    });
    
    describe('POST /', () => {
        const exec = async(favoriteWordList)=>{
            return await request(server)
                .post('/api/favoriteWordLists')
                .set('x-auth-token', token)
                .send(favoriteWordList);
        }

        it('Should create a favoriteWordList', async () => {
            const wordList = await createWordList();

            const favoriteWordList = {
                wordList: wordList._id
            }

            const res = await exec(favoriteWordList);
            // find the favoriteWordList after create
            const fwl = await FavoriteWordList.findById(res.body.result._id);

            expect(res.status).toBe(200);
            expect(res.body.result).toBeTruthy();
            expect(res.body.result._id).toBe(fwl._id.toHexString());
            expect(res.body.result.wordList).toBe(wordList._id.toHexString());
            expect(res.body.result.user).toBe(user._id.toHexString());
        });

        it('Should not create a favoriteWordList if already is exist', async () => {
            const wordList = await createWordList();

            let favoriteWordList = new FavoriteWordList({
                wordList: wordList._id,
                user: user._id
            });
            await favoriteWordList.save();

            favoriteWordList = {
                wordList: wordList._id
            }
            const res = await exec(favoriteWordList);

            expect(res.status).toBe(400);
            expect(res.body.error).toBeTruthy();
        });

        it('Should not create a favoriteWordList if wordList is not exist', async () => {
            const favoriteWordList = {
                wordList: mongoose.Types.ObjectId()
            }

            const res = await exec(favoriteWordList);

            expect(res.status).toBe(400);
            expect(res.body.error).toBeTruthy();
        });
    });

    describe('DELETE /:id', () => {
        const exec = async(address)=>{
            return await request(server)
                .delete(address)
                .set('x-auth-token', token)
                .send();
        }

        it('Should be delete the favoriteWordList', async () => {
            const wordList = await createWordList();

            const favoriteWordList = new FavoriteWordList({
                wordList: wordList._id,
                user: user._id
            });
            await favoriteWordList.save();

            const res = await exec(`/api/favoriteWordLists/${favoriteWordList._id}`);

            // find the favorieWordList after delete
            const fwl = await FavoriteWordList.findById(favoriteWordList._id);

            expect(res.status).toBe(200);
            expect(res.body.result).toBeTruthy();
            expect(fwl).toBeFalsy();
            expect(res.body.result._id).toBe(favoriteWordList._id.toHexString());
            expect(res.body.result.wordList).toBe(wordList._id.toHexString());
            expect(res.body.result.user).toBe(user._id.toHexString());
        });

        it('Should be delete the favoriteWordList', async () => {
            const res = await exec(`/api/favoriteWordLists/${mongoose.Types.ObjectId()}`);

            expect(res.status).toBe(404);
            expect(res.body.error).toBeTruthy();
        });
    });

    describe('DELETE /', () => {
        const exec = async()=>{
            return await request(server)
                .delete('/api/favoriteWordLists')
                .set('x-auth-token', token)
                .send();
        }

        it('Should delete all favoriteWordList', async () => {
            title = 'test title 1';
            const firstWordList = await createWordList();
            title = 'test title 2';
            const secondWordList = await createWordList();
            
            const favoriteWordLists = [
                {
                    wordList: firstWordList._id,
                    user: user._id
                },
                {
                    wordList: secondWordList._id,
                    user: user._id
                }
            ]
            await FavoriteWordList.insertMany(favoriteWordLists);

            const res = await exec();

            const fwl = await FavoriteWordList.find({ user: user._id});

            expect(res.status).toBe(200);
            expect(res.body.result).toBeTruthy();
            expect(fwl.length).toBe(0);
        });
    });
});