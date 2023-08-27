import response from "/opt/nodejs/response.mjs";
import { mUserCollection } from "/opt/nodejs/mongo_client.mjs";

export const getAllUserSlotsHandler = async (event) => {
    console.log(`received ${JSON.stringify(event)}`)
    const authorizationHeader = event?.headers?.Authorization ?? event?.headers?.authorization
    const decodedHeader = Buffer.from(authorizationHeader, "base64").toString()
    const [phoneNumber] = decodedHeader.split(":")
    const user = await mUserCollection.findOne({ 'phone': phoneNumber });

    console.log(`slots are ${user.slots} ; user: ${user}`)
    return response.success({ body: { slots: user.slots } })
}