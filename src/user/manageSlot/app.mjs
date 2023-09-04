import response from "/opt/nodejs/response.mjs";
import { mUserCollection, mSlotCollection } from "/opt/nodejs/mongo_client.mjs";

function slotIdToSlotDetails(slotId) {
    const year = parseInt(slotId.substring(0, 4))
    const month = parseInt(slotId.substring(4, 6))
    const dayOfMonth = parseInt(slotId.substring(6, 8))
    const slotNumber = slotId.substring(8, 10)

    console.log(`year: ${year}; month: ${month}; day: ${dayOfMonth}; slotNumber: ${slotNumber}`)
    if (!year || !month || !dayOfMonth || !slotNumber) return null;

    const slotDate = new Date()
    slotDate.setHours(0, 0, 0, 0)
    slotDate.setFullYear(year)
    slotDate.setMonth(month)
    slotDate.setDate(dayOfMonth)

    return { slotNumber, slotDate }
}

function removeItemFromArray(array, item) {
    for (let i = 0; i < array.length; i++) {
        if (array[i] == item) {
            let spliced = array.splice(i, 1);
            console.log("Removed element: " + spliced);
            console.log("Remaining elements: " + array);
        }
    }
    return array
}

export const manageSlotHandler = async (event) => {
    const authorizationHeader = event?.headers?.Authorization ?? event?.headers?.authorization
    const decodedHeader = Buffer.from(authorizationHeader.replace("Basic ", ""), "base64").toString()
    const [phoneNumber] = decodedHeader.split(":")
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

        const slotsAfterCancellation = removeItemFromArray(user.slots, slotId)
        await mUserCollection.updateOne({ 'phone': phoneNumber }, {
            $set: { slots: slotsAfterCancellation },
            $currentDate: { lastModified: true }
        })

        const dDate = slotId.substring(0, 8);
        const dNumber = slotId.substring(8);
        const dSlotDocument = (await mSlotCollection.findOne({ 'id': dDate }))?.[dNumber] ?? {};
        dSlotDocument.availableDoses = (dSlotDocument.availableDoses ?? 10) + 1

        await mSlotCollection.updateOne({ 'id': dDate }, {
            $set: { [dNumber]: dSlotDocument },
            $currentDate: { lastModified: true }
        })

        return response.success({
            body: {
                message: "Slot removed successfully",
                updatedSlots: slotsAfterCancellation
            }
        })
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

        const updatedSlots = removeItemFromArray(user.slots, oldSlotId)
        updatedSlots.push(slotId)

        await mUserCollection.updateOne({ 'phone': phoneNumber }, {
            $set: { slots: updatedSlots },
            $currentDate: { lastModified: true }
        })

        const oDate = oldSlotId.substring(0, 8);
        const oNumber = oldSlotId.substring(8);
        const oSlotDocument = (await mSlotCollection.findOne({ 'id': oDate }))?.[oNumber] ?? {};
        oSlotDocument.availableDoses = (oSlotDocument.availableDoses ?? 10) + 1

        await mSlotCollection.updateOne({ 'id': oDate }, {
            $set: { [oNumber]: oSlotDocument },
            $currentDate: { lastModified: true }
        }, { upsert: true })


        const sDate = slotId.substring(0, 8);
        const sNumber = slotId.substring(8);
        const slotDocument = (await mSlotCollection.findOne({ 'id': sDate }))?.[sNumber] ?? {};
        slotDocument.availableDoses = (slotDocument.availableDoses ?? 10) - 1

        await mSlotCollection.updateOne({ 'id': sDate }, {
            $set: { [sNumber]: slotDocument },
            $currentDate: { lastModified: true }
        }, { upsert: true })

        return response.success({
            body: {
                message: "Slot re-scheduled successfully",
                updatedSlots: updatedSlots
            }
        })
    }

    // new slot creation flow

    // handle duplicate registration
    if (user.slots.includes(slotId)) return response.error({
        body: { message: `You were already enrolled for this slot ${slotId}` }
    })

    // handle scheduling for past/lapsed dates
    if (slotDate.getTime() < today.getTime()) return response.error({
        body: { message: "You cannot book a lapsed slot" }
    })

    // restrict user to schedule a slot if there is an active slot
    const slotsToUpdate = user?.slots ?? []
    if (slotsToUpdate.length > 0) {
        slotsToUpdate.sort()
        const lastSlotId = slotsToUpdate[slotsToUpdate.length - 1]
        const lastSlotDate = slotIdToSlotDetails(lastSlotId)['slotDate']
        if (lastSlotDate && lastSlotDate.getTime() > today.getTime()) return response.error({
            body: { message: `Last booked slot for ${lastSlotDate} is still in progress` }
        })
    }

    // create a slot 
    slotsToUpdate.push(slotId)

    await mUserCollection.updateOne({ 'phone': phoneNumber }, {
        $set: { slots: slotsToUpdate },
        $currentDate: { lastModified: true }
    })

    const sDate = slotId.substring(0, 8);
    const sNumber = slotId.substring(8);
    const slotDocument = (await mSlotCollection.findOne({ 'id': sDate }))?.[sNumber] ?? {};
    slotDocument.availableDoses = (slotDocument.availableDoses ?? 10) - 1

    await mSlotCollection.updateOne({ id: sDate }, {
        $set: { [slotNumber]: slotDocument },
        $currentDate: { lastModified: true }
    }, { upsert: true })

    return response.success({
        body: {
            message: "Slot scheduled successfully",
            updatedSlots: slotsToUpdate
        }
    })
}