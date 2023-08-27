import bcrypt from 'bcrypt'

const saltRounds = 10;

export default class Crypto {

    static async generateHash(content) {
        return bcrypt.hash(content, saltRounds)
    }

    static async validate(content, hash) {
        return bcrypt.compare(content, hash)
    }

}