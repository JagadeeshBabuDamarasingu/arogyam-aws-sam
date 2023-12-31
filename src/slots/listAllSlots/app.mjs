import response from "/opt/nodejs/response.mjs";
import { mSlotCollection } from "/opt/nodejs/mongo_client.mjs";

const emptySlotDetails = {
    availableDoses: 10
};

const availableSlotsProjection = {
    availableDoses: 1
}

export const listAllSlotsHandler = async (event) => {
    console.log(`received: ${JSON.stringify(event)}`)
    const date = event.pathParameters.date

    const year = parseInt(date.substring(0, 4))
    const month = parseInt(date.substring(4, 6))
    const dayOfMonth = parseInt(date.substring(6, 8))

    if (!year || !month || !dayOfMonth) return response.error({
        body: { message: `Invalid date or Bad format: ${date}` }
    })

    const slotDocument = await mSlotCollection.findOne({ 'id': date })

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