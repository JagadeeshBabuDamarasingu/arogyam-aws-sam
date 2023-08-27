import response from "/opt/nodejs/response.mjs";
import loginResponseSchema from "/opt/nodejs/schema/login_response.mjs";
import { StatusCodes } from 'http-status-codes';

import { mUserCollection } from "/opt/nodejs/mongo_client.mjs";
import Crypto from "/opt/nodejs/crypt_utils.mjs";

export const loginUserHandler = async (event) => {

    if (event.httpMethod !== 'POST') {
        throw new Error(`loginUser only accept POST method, you tried: ${event.httpMethod}`);
    }

    const requestBody = JSON.parse(event.body)

    try {
        const loginRequest = await loginResponseSchema.validate(requestBody)
        const userIfExists = await mUserCollection.findOne({ 'phone': loginRequest.phone });

        if (!userIfExists) {
            return response.error({
                body: {
                    message: `User with ${loginRequest.phone} does not exist`,
                    statusCode: StatusCodes.NOT_FOUND
                }
            })
        }

        if (!await Crypto.validate(loginRequest.password, userIfExists.password)) {
            return response.error({
                body: {
                    message: "Invalid credentials",
                    statusCode: StatusCodes.UNAUTHORIZED
                }
            })
        }

        const { password, _id, ...safeUserReply } = userIfExists
        return response.success({ body: safeUserReply })
    } catch (error) {
        console.log(`login request err is ${error}`)
        return response.error({ body: { message: error.errors } })
    }
}