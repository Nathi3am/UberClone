const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
dotenv.config();

const userSchema = new mongoose.Schema({
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
        select: false
    },
    socketId: {
        type: String
    },
    paymentMethod: {
        type: String,
        enum: ["cash", "card", "wallet"],
        default: "cash"
    },
    profileImage: {
        type: String,
        default: ""
    },
    phone: {
        type: String,
        required: false
    },
    role: {
        type: String,
        enum: ["user", "captain", "admin"],
        default: "user"
    },
    suspended: {
        type: Boolean,
        default: false
    },
    activeTokens: [String],
    pushTokens: [String],
    createdAt: {
        type: Date,
        default: Date.now
    }
    ,
    activeRide: {
        type: require('mongoose').Schema.Types.ObjectId,
        ref: 'Ride',
        default: null
    }
});

userSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({ _id: this._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return token;
}

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password, 10);
}

const userModel = mongoose.model('user', userSchema);

module.exports = userModel;