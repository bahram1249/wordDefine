const {validate} = require('../../../models/user')

function createUser(){
    const user = {
        name: 'bahram',
        email: 'bahram.rajabiws@gmail.com',
        password: '123456'
    }
    return user;
}

describe('User Models => validateUser', ()=>{

    it("Should be validate with true data", async()=>{
        const user = createUser();

        const {error} = validate(user);
        expect(error).toBeFalsy();

    })

    it("Should be error if name is less than 3", async()=>{
        const user = createUser().name = 'ba'

        const {error} = validate(user);
        expect(error).toBeDefined();
    })

    it("Should be error if email is unvalid", async()=>{
        const user = createUser().email = 'havij'

        const {error} = validate(user);
        expect(error).toBeDefined();
    })

    it("Should be error if password less than 6", async()=>{
        const user = createUser().password = '12345'

        const {error} = validate(user);
        expect(error).toBeDefined();
    })

    it("Should be error if name is not passed", async()=>{
        const user = createUser().name = undefined;

        const {error} = validate(user);
        expect(error).toBeDefined();
    })

    it("Should be error if email is not passed", async()=>{
        const user = createUser().email = undefined;

        const {error} = validate(user);
        expect(error).toBeDefined();
    })

    it("Should be error if password is not passed", async()=>{
        const user = createUser().password = undefined;

        const {error} = validate(user);
        expect(error).toBeDefined();
    })
})