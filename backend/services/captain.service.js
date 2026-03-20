const captainModel = require('../models/captain.model');


module.exports.createCaptain = async ({ firstname, lastname, email, password, color, plate, capacity, vehicleType, make, year, brand }) => {
    if (!firstname || !email || !password || !color || !plate || !capacity || !vehicleType) {
        throw new Error('Please fill in all fields');
    }
    try {
        const captain = new captainModel({
            fullname: {
                firstname,
                lastname
            },
            email,
            password,
            isApproved: false,
            vehicle: Object.assign({
                color,
                plate,
                capacity,
                vehicleType
            },
            // map provided make/brand/year into vehicle object when available
            (brand ? { brand } : (make ? { brand: make } : {})),
            (year ? { year } : {}))
        });
        await captain.save();
        // console.log("Captain created", captain);
        return captain;
    } catch (error) {
        throw new Error(error);
    }

};