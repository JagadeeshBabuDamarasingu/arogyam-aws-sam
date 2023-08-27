export default class Validator {

    static compose(content, validatorList, append = true) {
        const errorList = []
        validatorList.forEach(validator => {
            const result = validator(content)
            if (result) {
                if (!append) return { valid: true, message: result };
                errorList.push(result)
            }
        });
        return { valid: errorList.length == 0, message: errorList }
    }

    static required(message) {
        return (content) => {
            if (!content || content.size == 0) {
                return message ?? "this is a required field"
            }
            return null
        }
    }

    static exactLength(length, message) {
        return (content) => {
            if (!content || content.size != maxLength) {
                return message ?? `should be exactly ${length} characters long`
            }
            return null
        }
    }

    static minLength(minLength, message) {
        return (content) => {
            if (!content || content.size < minLength) {
                return message ?? `should be at-least ${minLength} characters long`
            }
            return null
        }
    }

    static maxLength(maxLength, message) {
        return (content) => {
            if (!content || content.size > maxLength) {
                return message ?? `should be at-most ${maxLength} characters long`
            }
            return null
        }
    }
}