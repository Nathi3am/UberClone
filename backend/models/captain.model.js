const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const captainSchema = new mongoose.Schema({
    fullname: {
        firstname: {
            type: String,
            required: true,
            minlength: [3, 'First name must be at least 3 characters long']
        },
        lastname: {
            type: String,
            minlength: [3, 'Last name must be at least 3 characters long']
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'Please enter a valid email'],
        minlength: [6, 'Email must be at least 6 characters long']
    },
    password: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: false
    },
    profileImage: {
        type: String,
        default: null
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    socketId: {
        type: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    vehicle: {
        brand: {
            type: String,
            required: false
        },
        model: {
            type: String,
            required: false
        },
        color: {
            type: String,
            required: true,
            minlength: [3, 'Color must be at least 3 characters long']
        },
        image: {
            type: String,
            required: false,
            default: null
        },
        plate: {
            type: String,
            required: true,
            minlength: [3, 'Plate must be at least 3 characters long']
        },
        capacity: {
            type: Number,
            required: true,
            min: [1, 'Capacity must be at least 1']
        },
        year: {
            type: Number,
            required: false
        },
        vehicleType: {
            type: String,
            required: true,
            enum: ['car', 'motorcycle', 'auto', 'standard', 'xl', 'premium']
        }
    },
    license: {
        number: {
            type: String,
            required: false
        }
    },
    location: {
        ltd: {
            type: Number
        },
        lng: {
            type: Number
        }
    }
    ,
    isOnline: {
        type: Boolean,
        default: false
    }
    ,
    isSuspended: {
        type: Boolean,
        default: false
    },
    activeTokens: [String],
    pushTokens: [String],
    isApproved: {
        type: Boolean,
        default: false
    },
    // Single active session token (string). Only one device may hold this token.
    activeSessionToken: {
        type: String,
        default: null,
        index: true
    },
    pastRides: [
        {
            rideId: { type: require('mongoose').Schema.Types.ObjectId, ref: 'Ride' },
            user: { type: require('mongoose').Schema.Types.ObjectId, ref: 'user' },
            pickupAddress: { type: String },
            dropAddress: { type: String },
            pickupCoords: { lat: Number, lng: Number },
            dropCoords: { lat: Number, lng: Number },
            distance: { type: Number },
            price: { type: Number },
            durationSeconds: { type: Number },
            etaDisplay: { type: String },
            locationHistory: [{ lat: Number, lng: Number, ts: Date }],
            completedAt: { type: Date, default: Date.now }
        }
    ]
    ,
    walletBalance: {
        type: Number,
        default: 0
    }
    ,
    totalEarnings: {
        type: Number,
        default: 0
    }
    ,
    wallet: {
        balance: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        totalCommission: { type: Number, default: 0 },
        totalPaidOut: { type: Number, default: 0 }
    }
}, { timestamps: true })

// Ensure vehicle plate is unique across captains (sparse to allow missing plates)
captainSchema.index({ 'vehicle.plate': 1 }, { unique: true, sparse: true });

captainSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({ _id: this._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return token;
}

captainSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

captainSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password, 10);
}

const captainModel = mongoose.model('captain', captainSchema);

module.exports = captainModel;