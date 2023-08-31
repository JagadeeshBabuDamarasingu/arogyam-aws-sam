import response from "/opt/nodejs/response.mjs";
import { mUserCollection, mSlotCollection } from "/opt/nodejs/mongo_client.mjs";

function slotIdToSlotDetails(slotId) {
    const year = parseInt(slotId.substring(0, 4))
    const month = parseInt(slotId.substring(4, 6))
    const dayOfMonth = parseInt(slotId.substring(6, 8))
    const slotNumber = parseInt(slotId.substring(8, 10))

    if (!year || !month || !dayOfMonth || !slotNumber) return null;

    const slotDate = new Date()
    slotDate.setHours(0, 0, 0, 0)
    slotDate.setFullYear(year)
    slotDate.setMonth(month)
    slotDate.setDate(dayOfMonth)

    return { slotNumber, slotDate }
}

export const manageSlotHandler = async (event) => {
    const authorizationHeader = event?.headers?.Authorization ?? event?.headers?.authorization
    const decodedHeader = Buffer.from(authorizationHeader, "base64").toString()
    const [phoneNumber] = decodedHeader.replace("Basic ", "").split(":")
    const requestBody = JSON.parse(event.body)

    const slotId = requestBody?.slotId
    if (!slotId) return response.error({
        body: { message: "Slot Id is missing" }
    })

    const { slotNumber, slotDate } = slotIdToSlotDetails(slotId)

    if (!slotDate) return response.error({
        body: { message: "Invalid slot format" }
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const user = await mUserCollection.findOne({ 'phone': phoneNumber })
    console.log(`user: ${JSON.stringify(user)}`)

    // existing slot deletion flow
    if (event.httpMethod == "DELETE") {

        if (!user?.slots?.includes(slotId)) return response.error({
            body: { message: `You have not enrolled for this slot ${slotId}` }
        })

        slotDate.setDate(today.getDate() - 1)
        if (slotDate.getTime() < today.getTime()) return response.error({
            body: { message: "You cannot delete this slot at this point of time" }
        })

        await mUserCollection.updateOne({ 'phone': phoneNumber }, {
            $set: { slots: user.slots.filter(slot => slot == slotId) },
            $currentDate: { lastModified: true }
        })

        await mSlotCollection.updateOne({ 'id': slotId.substring(0, 8) }, {
            $inc: { [slotNumber]: -1 },
            $currentDate: { lastModified: true }
        })

        return response.success({ body: { message: "Slot removed successfully" } })
    }


    // existing slot update operation flow
    if (requestBody?.operation == "update") {
        const oldSlotId = requestBody?.oldSlotId
        if (!oldSlotId) return response.error({
            body: { message: "old slot id is required" }
        })

        if (!user?.slots?.includes(oldSlotId)) return response.error({
            body: { message: `You have not enrolled for this slot ${oldSlotId}` }
        })

        slotDate.setDate(today.getDate() - 1)
        if (slotDate.getTime() < today.getTime()) return response.error({
            body: { message: "You cannot update this slot at this point of time" }
        })

        const updatedSlots = user.slots.filter(slot => slot == oldSlotId)
        updatedSlots.push(slotId)

        await mUserCollection.updateOne({ 'phone': phoneNumber }, {
            $set: { slots: updatedSlots },
            $currentDate: { lastModified: true }
        })

        await mSlotCollection.updateOne({ 'id': oldSlotId.substring(0, 8) }, {
            $inc: { [oldSlotId.substring(8)]: -1 },
            $currentDate: { lastModified: true }
        }, { upsert: true })

        await mSlotCollection.updateOne({ 'id': slotId.substring(0, 8) }, {
            $inc: { [slotNumber]: 1 },
            $currentDate: { lastModified: true }
        }, { upsert: true })

        return response.success({ body: { message: "Slot updated successfully" } })
    }

    // new slot creation flow
    if (slotDate.getTime() < today.getTime()) return response.error({
        body: { message: "You cannot book a lapsed slot" }
    })

    const slotsToUpdate = user?.slots ?? []
    if (slotsToUpdate.length > 0) {
        slotsToUpdate.sort()
        const lastSlotId = slotsToUpdate[slotsToUpdate.length - 1]
        const { _, lastSlotDate } = slotIdToSlotDetails(lastSlotId)
        if (lastSlotDate && lastSlotDate.getTime() < today.getTime()) return response.error({
            body: { message: `Last booked slot for ${lastSlotDate} is still in progress` }
        })
    }

    slotsToUpdate.push(slotId)

    await mUserCollection.updateOne({ 'phone': phoneNumber }, {
        $set: { slots: slotsToUpdate },
        $currentDate: { lastModified: true }
    })

    await mSlotCollection.updateOne({ id: slotId.substring(0, 8) }, {
        $inc: { [slotNumber]: 1 },
        $currentDate: { lastModified: true }
    }, { upsert: true })

    return response.success({ body: { message: "slot booked successfully " } })
}