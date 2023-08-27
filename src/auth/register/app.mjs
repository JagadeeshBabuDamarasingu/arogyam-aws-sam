import response from "/opt/nodejs/response.mjs";
import registerResponseSchema from "/opt/nodejs/schema/register_response.mjs";
import role from "/opt/nodejs/enums/role.mjs";
import status from "/opt/nodejs/enums/vaccination_status.mjs";
import { StatusCodes } from 'http-status-codes';

import { mUserCollection } from "/opt/nodejs/mongo_client.mjs";
import Crypto from "/opt/nodejs/crypt_utils.mjs";

export const registerUserHandler = async (event) => {

    if (event.httpMethod !== 'POST') {
        throw new Error(`registerUser only accept POST method, you tried: ${event.httpMethod}`);
    }

    const requestBody = JSON.parse(event.body)

    try {
        const registerRequest = await registerResponseSchema.validate(requestBody)
        const userIfExists = await mUserCollection.findOne({ 'phone': registerRequest.phone });

        if (userIfExists) {
            return response.success({
                statusCode: StatusCodes.CONFLICT,
                body: { message: `User with ${registerRequest.phone} phone number already exists` }
            })
        }

        registerRequest.password = await Crypto.generateHash(registerRequest.password)
        registerRequest.status = status.None
        registerRequest.role = role.User
        registerRequest.slots = []

        await mUserCollection.insertOne(registerRequest)

    } catch (error) {
        console.log(`register request err is ${error.errors}`)
        return response.error({ body: { message: error.errors } })
    }

    return response.success({
        body: { message: `User with ${requestBody.phone} phone number created!` },
        statusCode: StatusCodes.CREATED
    })
}