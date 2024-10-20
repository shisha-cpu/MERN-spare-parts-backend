import { request } from "express";
import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true
    },
    wholesale: {
        type: Boolean,
        default: false
    },
    basket: [{
        product: {
            type: Object,
            required: true
        },
        count: {
            type: Number,
            required: true
        }
    }],
    orderHistory: [{
        orderDate: {
            type: Date,
            default: Date.now
        },
        products: [{
            product: {
                type: Object,
                required: true
            },
            count: {
                type: Number,
                required: true
            }
        }]
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const UserModel = mongoose.model('User', userSchema);
export default UserModel;
