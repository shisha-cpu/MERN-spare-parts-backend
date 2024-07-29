import { request } from "express";
import mongoose from "mongoose";

const userSchema  = mongoose.Schema({
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
    phone:{
        type : String , 
        request : true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    wholesale : {
        type : Boolean,
        required : true,
        default : false
    },
    basket : {
        type : Array,
    }
})

const UserModel = mongoose.model('User' , userSchema)
export default UserModel