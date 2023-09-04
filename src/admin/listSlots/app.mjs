import response from "/opt/nodejs/response.mjs";
import { mSlotCollection } from "/opt/nodejs/mongo_client.mjs";
import status from "/opt/nodejs/enums/vaccination_status.mjs";

const emptySlotDetails = {
    availableDoses: 10
};

export const adminDataHandler = async (event) => {
    console.log(`received: ${JSON.stringify(event)}`)

    const date = event.pathParameters.date
    const year = parseInt(date.substring(0, 4))
    const month = parseInt(date.substring(4, 6))
    const dayOfMonth = parseInt(date.substring(6, 8))

    if (!year || !month || !dayOfMonth) return response.error({
        body: { message: `Invalid date or Bad format: ${date}` }
    })


    const queryParams = event.queryStringParameters;
    const reqStatus = queryParams?.status ?? status.FirstDose

    const slotDocument = await mSlotCollection.findOne({ 'id': date })
    console.log(`slotDocument: ${JSON.stringify(slotDocument)}`)

    const slots = []
    for (let i = 0; i < 14; i++) {
        const number = i.toString().padStart(2, '0');
        const slotDetails = slotDocument?.[number] ?? emptySlotDetails
        slots.push({ [`${date}${number}`]: slotDetails })
    }

    return response.success({
        body: { [date]: slots }
    })
}
