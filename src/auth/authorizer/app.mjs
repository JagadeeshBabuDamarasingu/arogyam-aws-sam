import role from "/opt/nodejs/enums/role.mjs";
import { mUserCollection } from "/opt/nodejs/mongo_client.mjs";
import Crypto from "/opt/nodejs/crypt_utils.mjs";

function generateResponse(methodArn, effect) {
    return {
        principalId: 'user',
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: methodArn,
                },
            ],
        },
    };
}

export const authorizeHandler = async (event) => {
    console.log(`received ${JSON.stringify(event)}`)
    const methodArn = event.methodArn
    const authorizationHeader = event?.headers?.Authorization ?? event?.headers?.authorization
    if (!authorizationHeader) {
        console.log("Authorization Header not provided")
        return generateResponse(methodArn, "Deny")
    }

    const decodedHeader = Buffer.from(authorizationHeader, "base64").toString()
    const [phoneNumber, password] = decodedHeader.split(":")
    if (!phoneNumber || !password) {
        console.log("Authorization Header bad format")
        return generateResponse(methodArn, "Deny")
    }

    const userIfExists = await mUserCollection.findOne({ 'phone': phoneNumber });
    if (!userIfExists || !await Crypto.validate(password, userIfExists.password)) {
        console.log("Invalid credentials")
        return generateResponse(methodArn, "Deny")
    }

    const path = event.path
    console.log(`path requested! : ${path}`)
    if (path && path.includes("admin") && userIfExists.role != role.Admin) {
        console.log("Forbidden")
        return generateResponse(methodArn, "Deny")
    }

    return generateResponse(methodArn, "Allow")
}