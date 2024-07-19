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
    createdAt: {
        type: Date,
        default: Date.now
    },
    wholesale : {
        type : Boolean,
        required : true,
        default : false
    }
})

const UserModel = mongoose.model('User' , userSchema)
export default UserModel