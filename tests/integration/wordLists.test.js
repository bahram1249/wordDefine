const request = require('supertest');
const { WordList } = require('../../models/wordList');
const { Word } = require('../../models/word');
const { ONLY_ME, EVERYONE, USER_WITH_PASSWORD} = require('../../models/wordList').enum;
const { User } = require('../../models/user');
const mongoose = require('mongoose');

let server;
let user;
let token;
let title;
let visible;
let addWordBy;
let password;

async function createUser(){
    const user = new User({
        name: 'test1',
        email: 'test1@gmail.com',
        password: '123456'
    });
    await user.save();
    return user;
}

async function createSecondUser(){
    const user = new User({
        name: 'test2',
        email: 'test2@gmail.com',
        password: '123456'
    });
    await user.save();
    return user;
}

async function createWordList(){
    const wordList = new WordList({
        title,
        visible,
        addWordBy,
        password,
        user: user._id
    });
    if(wordList.password) await wordList.calculateHash();
    await wordList.save();
    return wordList;
}

describe('/api/wordLists', () => {
    beforeAll(async(done) => {
       server = require('../../app');
       user = await createUser();
       token = user.generateAuthToken();
       done();
    });

    afterAll(async(done) => {
        await User.deleteMany({}); 
        await server.close();
        done();
    });

    beforeEach(async(done) => {
        title = 'BookSmart Movie';
        visible = EVERYONE;
        addWordBy = ONLY_ME;
        password = undefined;
        done();
    });

    afterEach(async(done) => {
        await WordList.deleteMany({}); 
        done();
    });

    describe('GET /', ()=>{
        const exec = async(address)=>{
            return await request(server)
                .get(address)
                .set('x-auth-token', token)
                .send();
        }

        it('Should get all wordLists', async() => {
            const wordLists = [
                { title: 'testTitle1', user: user._id },
                { title: 'testTitle2', user: user._id }
            ]
            await WordList.insertMany(wordLists);

            const res = await exec('/api/wordLists');

            expect(res.status).toBe(200);
            expect(res.body.result.length).toBe(wordLists.length);
            expect(res.body.result[0].user).toMatchObject({ _id: user._id.toHexString(), name: user.name});
       });

       it('Should return only 1 result with limit 1', async () => {
            const wordLists = [
                { title: 'testTitle1', user: user._id },
                { title: 'testTitle2', user: user._id }
            ]
            await WordList.insertMany(wordLists);

            const res = await exec('/api/wordLists?limit=1');

            expect(res.status).toBe(200);
            expect(res.body.result.length).toBe(1);
            expect(res.body.nextLink).toBeTruthy();
            expect(res.body.previousLink).toBeFalsy();
        });

       it('Should return only 1 result with limit 1 in page 2', async () => {
            const userId = user._id;
            const wordLists = [
                { title: 'testTitle1', user: userId },
                { title: 'testTitle2', user: userId }
            ]
            await WordList.insertMany(wordLists);

            const res = await exec('/api/wordLists?limit=1&page=2');

            expect(res.status).toBe(200);
            expect(res.body.result.length).toBe(1);
            expect(res.body.previousLink).toBeTruthy();
        });

        it('Should return only my wordList', async () => {
            const userId = user._id;
            const wordLists = [
                { title: 'testTitle1', user: userId },
                { title: 'testTitle2', user: mongoose.Types.ObjectId() }
            ]
            await WordList.insertMany(wordLists);

            const res = await exec('/api/wordLists');

            expect(res.status).toBe(200);
            expect(res.body.result.length).toBe(1);
            expect(res.body.previousLink).toBeFalsy();
            expect(res.body.nextLink).toBeFalsy();
        });

        it('Should return all wordList', async () => {
            const userId = user._id;
            const wordLists = [
                { title: 'testTitle1', user: userId },
                { title: 'testTitle2', user: mongoose.Types.ObjectId() }
            ]
            await WordList.insertMany(wordLists);

            const res = await exec(`/api/wordLists?createBy=${EVERYONE}`);

            expect(res.status).toBe(200);
            expect(res.body.result.length).toBe(2);
        });
   });

   describe('GET /:id', () => {
        it('Should return specific wordList', async () => {
            const wordList = await createWordList();

            const res = await request(server)
            .get(`/api/wordLists/${wordList._id}`)
            .set('x-auth-token', token)
            .send();

            expect(res.status).toBe(200);
            expect(res.body.result.title).toBe(wordList.title);
        });
   });

   describe('POST /', () => {
       const exec = async(wordList)=>{
           return await request(server)
            .post('/api/wordLists')
            .set('x-auth-token', token)
            .send(wordList);
       }

       it('Should create wordList', async() => {
            const wordList = {
                title: "BookSmart Movie"
            }

            const res = await exec(wordList);
            // find the wordList
            const wl = await WordList.findById(res.body.result._id);

            expect(res.status).toBe(200);
            expect(res.body.result.user).toBe(user._id.toHexString());
            expect(res.body.result.title).toBe(wordList.title);
            expect(res.body.result.visible).toBe(EVERYONE);
            expect(res.body.result.addWordBy).toBe(ONLY_ME);
            expect(wl).toBeTruthy();
        });

        it('Should create wordList with this given visible and addWordBy', async () => {
            const wordList = {
                title: 'BookSmart Movie',
                visible: EVERYONE,
                addWordBy: USER_WITH_PASSWORD,
                password: '123456'
            }

            const res = await exec(wordList);

            expect(res.status).toBe(200);
            expect(res.body.result.visible).toBe(wordList.visible);
            expect(res.body.result.addWordBy).toBe(wordList.addWordBy);
            expect(res.body.result.password).toBeFalsy();
        });
   });

    describe('PUT /:id', () => {
            const exec = async(address, newWordList)=>{
                return await request(server)
                    .put(address)
                    .set('x-auth-token', token)
                    .send(newWordList);
            }

            it('Should update wordList', async () => {
                const wordList = await createWordList();

                const newWordList = {
                    title: 'The hangover Movie',
                    visible: USER_WITH_PASSWORD,
                    addWordBy: USER_WITH_PASSWORD,
                    password: '1234567'
                }

                const res = await exec(`/api/wordLists/${wordList._id}`, newWordList);

                expect(res.status).toBe(200);
                expect(res.body.result._id).toBe(wordList._id.toHexString());
                expect(res.body.result.visible).toBe(newWordList.visible);
                expect(res.body.result.addWordBy).toBe(newWordList.addWordBy);
                expect(res.body.result.password).toBeFalsy();
            });
    });

    describe('DELETE /:id', () => {
        const exec = async(address)=>{
            return await request(server)
                .delete(address)
                .set('x-auth-token', token)
                .send();
        }

        it('Should delete wordList', async () => {
            const wordList = await createWordList();

            const res = await exec(`/api/wordLists/${wordList._id}`);

            // find the wordList
            const wl = await WordList.findById(wordList._id);

            expect(res.status).toBe(200);
            expect(res.body.result._id).toBe(wordList._id.toHexString());
            expect(res.body.result.visible).toBe(wordList.visible);
            expect(res.body.result.addWordBy).toBe(wordList.addWordBy);
            expect(res.body.result.password).toBeFalsy();
            expect(wl).toBeFalsy();
        });

        it('Should delete all word for deleted wordList', async () => {
            const wordList = await createWordList();

            let word = {
                name: 'dog',
                user: user._id,
                wordList: wordList._id
            }
            word = new Word(word);
            await word.save();

            const wordAccessToken = wordList.generateWordAccessToken(user._id);

            const res = await exec(`/api/wordLists/${wordList._id}`);

            // for asynchronous purpose ... after deleted a wordList, word deleting asynchronously
            const resWord = await request(server)
            .get(`/api/words/${word._id}`)
            .set('x-auth-token', token)
            .set('word-access-token', wordAccessToken)
            .send();

            expect(res.status).toBe(200);
            expect(res.body.result._id).toBe(wordList._id.toHexString());
            expect(res.body.result.visible).toBe(wordList.visible);
            expect(res.body.result.addWordBy).toBe(wordList.addWordBy);
            expect(res.body.result.password).toBeFalsy();
            expect(resWord.status).toBe(404);
        });
    });

    describe('DELETE /', () => {
        const exec = async()=>{
            return await request(server)
                .delete('/api/wordLists/')
                .set('x-auth-token', token)
                .send();
        }

        it('Should delete all wordList', async () => {
            const wordLists = [
                {title: 'BookSmart Movie', user: user._id},
                {title: 'The hangover Movie', user: user._id}
            ]
            await WordList.insertMany(wordLists)

            const res = await exec();

            // find all wordLists
            const wls = await WordList.find({ user: user._id });

            expect(res.status).toBe(200);
            expect(wls.length).toBe(0);
        });

        it('Should delete all word for deleted wordLists', async () => {
            const wordList = await createWordList();
            const wordAccessToken = wordList.generateWordAccessToken(user._id);

            const word = new Word({
                name: 'dog',
                user: user._id,
                wordList: wordList._id
            });
            await word.save();

            const res = await exec();
            // for asynchronous purpose ... after deleted a wordList, word deleting asynchronously
            const resWord = await request(server)
            .get('/api/words/')
            .set('x-auth-token', token)
            .set('word-access-token', wordAccessToken)
            .send();

            expect(res.status).toBe(200);
            expect(resWord.status).toBe(404);
        });
    });

    describe('POST /api/wordLists/token/:id', () => {
        let newUser;
        let newUserToken;

        beforeAll(async(done)=>{
            newUser = await createSecondUser();
            newUserToken = newUser.generateAuthToken();
            done();
        });

        afterAll(async(done)=>{
            await newUser.remove();
            done();
        });

        const exec = async(token, address, password)=>{
            return await request(server)
                .post(address)
                .set('x-auth-token', token)
                .send({password});
        }

        it('Should get token of wordList with password', async () => {
            visible = USER_WITH_PASSWORD;
            password = '123456';
            const wordList = await createWordList();

            const res = await exec(newUserToken ,`/api/wordLists/token/${wordList._id}`, password);

            expect(res.status).toBe(200);
            expect(res.body.result).toBeTruthy();
        });

        it('Should get token of wordList by the owner of wordList without password', async () => {
            visible = USER_WITH_PASSWORD;
            password = '123456';
            const wordList = await createWordList();

            const res = await exec(token ,`/api/wordLists/token/${wordList._id}`);

            expect(res.status).toBe(200);
            expect(res.body.result).toBeTruthy();
        });

        it('Should get token of wordList visible is everyone by any user', async () => {
            addWordBy = USER_WITH_PASSWORD;
            password = '123456';
            const wordList = await createWordList();

            const res = await exec(newUserToken ,`/api/wordLists/token/${wordList._id}`);

            expect(res.status).toBe(200);
            expect(res.body.result).toBeTruthy();
        });
    });
});