import response from "/opt/nodejs/response.mjs";
import { mUserCollection } from "/opt/nodejs/mongo_client.mjs";
import status from "/opt/nodejs/enums/vaccination_status.mjs";

const sortOrder = { name: 1 };
const userProjection = { name: 1, aadhar: 1, age: 1, pincode: 1, status: 1 };

const mapContains = (map, val) => {
    for (let [k, v] of map) {
        if (v == val) {
            return true;
        }
    }
    return false;
}



export const adminDataHandler = async (event) => {
    console.log(`received: ${JSON.stringify(event)}`)
    const filters = {};

    const reqFilters = event.queryStringParameters;

    if (reqFilters) {
        const pinCode = parseInt(reqFilters.pincode ?? reqFilters.pinCode);
        if (pinCode) filters['pincode'] = pinCode;

        const age = parseInt(reqFilters.age);
        if (age) filters['age'] = age;

        const reqStatus = parseInt(reqFilters.status);
        if (reqStatus) {
            if (!mapContains(status, reqStatus)) return response.error({
                body: { message: "Invalid Vaccination status" }
            })

            filters['status'] = reqStatus
        }

        const aadhar = reqFilters.aadhar;

        if (aadhar) {
            if (aadhar.length != 12) {
                return response.error({
                    body: { message: "Invalid aadhar details" }
                })
            }
            filters['aadhar'] = aadhar;
        }
    }

    console.log(`filters are: ${JSON.stringify(filters)}`)

    const users = await mUserCollection.find(filters)
        .sort(sortOrder)
        .project(userProjection)
        .toArray();

    console.log(`users are : ${JSON.stringify(users)}`)
    return response.success({ body: { users: users } });
}